import { Chord, Note } from 'tonal'
import type { ChordEvent } from '../schemas/chord.schema'
import { STEPS_PER_BAR } from '../schemas/project.schema'
import { getChordInversion, getChordNotes } from '../theory/chord.engine'
import { midiToPitch } from '../theory/scale.engine'

export function canCycleArpInversions(chords?: readonly ChordEvent[]): boolean {
  return chords?.some((chord) => chord.durationBars >= 2) ?? false
}

function harmonyKey(chord: ChordEvent): string {
  const chromas = new Set(
    (chord.notes.length ? chord.notes : getChordNotes(chord.name))
      .map((pitch) => Note.chroma(pitch))
      .filter((chroma): chroma is number => chroma !== undefined)
  )
  return `${Note.chroma(Chord.get(chord.name).tonic ?? '')}:${[...chromas].sort((a, b) => a - b).join(',')}`
}

/** Resolves contiguous repetitions independently of event IDs and generation range. */
export function getArpInversionAnchors(chords: readonly ChordEvent[] = []): Map<ChordEvent, ChordEvent> {
  const anchors = new Map<ChordEvent, ChordEvent>()
  const ordered = [...chords].sort((a, b) => a.startBar - b.startBar)
  for (const chord of ordered) {
    const previous = ordered.find(
      (candidate) =>
        candidate.startBar < chord.startBar && candidate.startBar + candidate.durationBars === chord.startBar
    )
    anchors.set(
      chord,
      previous && harmonyKey(previous) === harmonyKey(chord) ? (anchors.get(previous) ?? previous) : chord
    )
  }
  return anchors
}

export function getArpInversionBarOffset(step: number, anchor?: ChordEvent): number {
  const bar = Math.floor(step / STEPS_PER_BAR)
  return Math.max(0, bar - Math.floor(anchor?.startBar ?? 0))
}

/** Rotates the bass through distinct chord tones, then recenters by whole octaves. */
export function cycleArpInversion(
  pool: number[],
  barOffset: number,
  rootChroma: number | undefined,
  baseInversion: number,
  voicingBass?: number
): number[] {
  if (pool.length === 0) return pool
  // The highest octave layer may exceed MIDI 127; naming it directly would clamp its pitch classes.
  const registerShift = Math.max(Math.ceil(-pool[0] / 12), Math.min(0, Math.floor((127 - pool[pool.length - 1]) / 12)))
  if (registerShift !== 0) pool = pool.map((midi) => midi + registerShift * 12)
  if (pool.length < 2) return pool
  const chromas = [...new Set(pool.map((midi) => midi % 12))].sort((a, b) => a - b)
  const rootIndex = Math.max(0, chromas.indexOf(rootChroma ?? chromas[0]))
  const baseIndex = voicingBass === undefined ? rootIndex + baseInversion : chromas.indexOf(voicingBass % 12)
  const bassChroma = chromas[(Math.max(0, baseIndex) + barOffset) % chromas.length]
  const rotation = pool.findIndex((midi) => midi % 12 === bassChroma)
  if (rotation <= 0) return pool

  let pitches = pool.map(midiToPitch)
  // One-step calls also support extended chords with more than four possible inversions.
  for (let index = 0; index < rotation; index++) pitches = getChordInversion(pitches, 1)
  const inverted: number[] = []
  for (const pitch of pitches) {
    // Tonal's MIDI value becomes null above 127, before the register can be recentered.
    let midi = Note.get(pitch).height
    // Open voicings can span more than an octave; keep the rotated bass below every other voice.
    while (inverted.length && midi <= inverted[inverted.length - 1]) midi += 12
    inverted.push(midi)
  }
  const mean = (midis: number[]) => midis.reduce((sum, midi) => sum + midi, 0) / midis.length
  const shift = Math.round((mean(pool) - mean(inverted)) / 12)
  const safeShift = Math.max(
    Math.ceil(-inverted[0] / 12),
    Math.min(Math.floor((127 - inverted[inverted.length - 1]) / 12), shift)
  )
  return inverted.map((midi) => midi + safeShift * 12)
}
