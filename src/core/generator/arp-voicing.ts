import { Note } from 'tonal'
import type { ChordEvent } from '../schemas/chord.schema'
import { STEPS_PER_BAR } from '../schemas/project.schema'
import type { ArpPitchSource } from '../schemas/generator.schema'

/** Where a resolved arpeggio pitch pool came from; drives UI hints and tests. */
export type ArpPoolSource = 'voicing' | 'pitch-classes'

export interface ArpVoicingPitches {
  /** Absolute MIDI pitches of the chord, ascending and free of identical duplicates. */
  midis: number[]
  /** Tonal pitch names matching `midis`, so callers can compare against the original voicing. */
  names: string[]
  lowMidi: number
  highMidi: number
}

/**
 * Resolves the absolute pitches of a chord's Chord Studio voicing.
 * Entries without an explicit octave or that Tonal cannot parse are dropped, because only an
 * absolute pitch can carry a register. A chord without any usable pitch yields null.
 */
export function getArpChordVoicingPitches(chord: ChordEvent | undefined): ArpVoicingPitches | null {
  if (!chord) return null
  const parsed = chord.voicing
    .map((pitch) => ({ name: pitch, note: Note.get(pitch) }))
    .filter((entry) => !entry.note.empty && typeof entry.note.oct === 'number' && entry.note.midi !== null)
  const byMidi = new Map<number, string>()
  for (const entry of parsed) byMidi.set(entry.note.midi!, entry.name)
  const midis = [...byMidi.keys()].sort((a, b) => a - b)
  if (midis.length === 0) return null
  return {
    midis,
    names: midis.map((midi) => byMidi.get(midi)!),
    lowMidi: midis[0],
    highMidi: midis[midis.length - 1]
  }
}

/** Returns the user chord that is active at a given step, if any. */
export function findActiveArpChord(chords: readonly ChordEvent[] | undefined, step: number): ChordEvent | undefined {
  return chords?.find(
    (chord) => step >= chord.startBar * STEPS_PER_BAR && step < (chord.startBar + chord.durationBars) * STEPS_PER_BAR
  )
}

/**
 * True when the mode asks for the absolute Chord Studio voicing and a user chord with usable
 * pitches is active. Used by the UI to warn about the synthetic pitch-class fallback.
 */
export function isArpVoicingAvailable(
  pitchSource: ArpPitchSource,
  chords: readonly ChordEvent[] | undefined,
  step: number
): boolean {
  if (pitchSource !== 'chord-voicing') return false
  return getArpChordVoicingPitches(findActiveArpChord(chords, step)) !== null
}

export interface ArpVoicingSpan {
  lowMidi: number
  highMidi: number
  lowPitch: string
  highPitch: string
  /** Number of overlapping chords that contribute a usable voicing to the span. */
  chordCount: number
}

/**
 * Union of the voicings of all user chords overlapping a step range. The UI shows this as the
 * real register of chord-voicing mode, because base octave and octave range do not apply there.
 */
export function getArpVoicingSpan(
  chords: readonly ChordEvent[] | undefined,
  range: { startStep: number; endStep: number }
): ArpVoicingSpan | null {
  if (!chords || chords.length === 0) return null
  const start = Math.max(0, range.startStep)
  const end = Math.max(start, range.endStep)
  const midis: number[] = []
  let chordCount = 0
  for (const chord of chords) {
    const chordStart = chord.startBar * STEPS_PER_BAR
    const chordEnd = (chord.startBar + chord.durationBars) * STEPS_PER_BAR
    if (chordEnd <= start || chordStart >= end) continue
    const pitches = getArpChordVoicingPitches(chord)
    if (!pitches) continue
    chordCount++
    midis.push(...pitches.midis)
  }
  if (midis.length === 0) return null
  const lowMidi = Math.min(...midis)
  const highMidi = Math.max(...midis)
  return {
    lowMidi,
    highMidi,
    lowPitch: Note.fromMidi(lowMidi),
    highPitch: Note.fromMidi(highMidi),
    chordCount
  }
}

/**
 * Scaled, absolute-pitch passing tones for a single voicing tone. In chord-voicing mode the arp
 * lives in the register the user voiced, so no octave window is rebuilt: candidates are the
 * diatonic scale tones one to two semitones next to the chosen pitch. Returns [] when the
 * surrounding tones are not scale-conform, which keeps 100% adherence strictly voicing-only.
 * `direction` is the audible travel sign; 0 (no travel yet) keeps every candidate unbiased.
 */
export function getArpVoicingPassingPitches(
  chordMidi: number,
  scaleChromas: ReadonlySet<number>,
  chordChromas: ReadonlySet<number>,
  direction: number
): number[] {
  const candidates: number[] = []
  for (const offset of [1, 2, -1, -2]) {
    const pitch = chordMidi + offset
    if (pitch < 0 || pitch > 127) continue
    if (!scaleChromas.has(pitch % 12) || chordChromas.has(pitch % 12)) continue
    candidates.push(pitch)
  }
  const directional =
    direction === 0 ? [] : candidates.filter((pitch) => (direction > 0 ? pitch > chordMidi : pitch < chordMidi))
  return directional.length > 0 ? directional : candidates
}
