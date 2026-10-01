import type { ChordEvent } from '../schemas/chord.schema'
import {
  buildChordVoicing,
  deriveChordIdentity,
  getChordInversion,
  getChordNotes,
  getDiatonicChords,
  type DiatonicChord,
  type VoicingStyle
} from './chord.engine'
import { createProgressionChords, getProgressionById, type PredefinedProgression } from './progressions'
import { midiToPitch, pitchToMidi } from './scale.engine'
import { optimizeProgressionVoiceLeading } from './voice-leading'
import { transposeChordProgression } from './chord-transposition'

export function setChordInversion(
  chord: ChordEvent,
  inversion: 0 | 1 | 2 | 3,
  chordRegister: number,
  voicingStyle: VoicingStyle
): ChordEvent {
  const baseNotes = getChordNotes(chord.name)
  const effectiveBase = baseNotes.length > 0 ? baseNotes : chord.notes
  const voicing = buildChordVoicing(chord.name, chordRegister, inversion, voicingStyle)

  return {
    ...chord,
    inversion,
    notes: getChordInversion(effectiveBase, inversion),
    voicing: voicing.length > 0 ? voicing : chord.voicing
  }
}

export function transposeVoicingNote(
  chord: ChordEvent,
  noteIndex: number,
  midi: number,
  palette: DiatonicChord[],
  key: string,
  scale: string
): ChordEvent {
  if (noteIndex < 0 || noteIndex >= chord.voicing.length) return chord
  const voicing = [...chord.voicing]
  voicing[noteIndex] = midiToPitch(Math.max(0, Math.min(127, Math.round(midi))))
  const identity = deriveChordIdentity(voicing, palette, key, scale)
  return { ...chord, voicing, ...identity }
}

export function addVoicingNote(
  chord: ChordEvent,
  pitch: string,
  palette: DiatonicChord[],
  key: string,
  scale: string
): ChordEvent {
  if (chord.voicing.includes(pitch)) return chord
  const voicing = [...chord.voicing, pitch].sort((a, b) => pitchToMidi(a) - pitchToMidi(b))
  const identity = deriveChordIdentity(voicing, palette, key, scale)
  return { ...chord, voicing, ...identity }
}

export function removeVoicingNote(
  chord: ChordEvent,
  noteIndex: number,
  palette: DiatonicChord[],
  key: string,
  scale: string
): ChordEvent | null {
  if (noteIndex < 0 || noteIndex >= chord.voicing.length) return chord
  const voicing = chord.voicing.filter((_, i) => i !== noteIndex)
  if (voicing.length === 0) return null
  const identity = deriveChordIdentity(voicing, palette, key, scale)
  return { ...chord, voicing, ...identity }
}

export function renameChordFromVoicing(
  chord: ChordEvent,
  palette: DiatonicChord[],
  key: string,
  scale: string
): ChordEvent {
  const identity = deriveChordIdentity(chord.voicing, palette, key, scale)
  return { ...chord, ...identity }
}

export function transposeVoicingOctave(chord: ChordEvent, deltaOctave: number): ChordEvent {
  if (deltaOctave === 0) return chord
  const deltaMidi = deltaOctave * 12
  const newVoicing = chord.voicing.map((pitch) => {
    const midi = pitchToMidi(pitch) + deltaMidi
    return midiToPitch(Math.max(12, Math.min(115, midi)))
  })
  return { ...chord, voicing: newVoicing }
}

export function duplicateChordEvent(chord: ChordEvent): ChordEvent {
  return {
    ...chord,
    id: crypto.randomUUID(),
    startBar: chord.startBar + chord.durationBars
  }
}

export interface BuildProgressionChordsOptions {
  progressionId: string
  key: string
  targetBars: number
  chordRegister: number
  voicingStyle: VoicingStyle
  autoSmooth?: boolean
}

export function generateProgressionChords(options: BuildProgressionChordsOptions): {
  preset: PredefinedProgression
  chords: ChordEvent[]
} {
  const preset = getProgressionById(options.progressionId)
  if (!preset) throw new Error(`Unknown progression ID: "${options.progressionId}"`)

  let chords = createProgressionChords(
    options.progressionId,
    options.key,
    options.targetBars,
    options.chordRegister,
    options.voicingStyle
  )
  if (options.autoSmooth && chords.length > 1) {
    chords = optimizeProgressionVoiceLeading(chords, options.chordRegister)
  }

  return { preset, chords }
}

export interface TransposeProgressionOptions {
  chords: ChordEvent[]
  selectedProgressionId: string | null
  currentKey: string
  currentScale: string
  newKey: string
  newScale: string
  totalBars: number
  chordRegister: number
  voicingStyle: VoicingStyle
}

export function transposeProgressionToScale(options: TransposeProgressionOptions): {
  chords: ChordEvent[]
  keepPreset: boolean
} {
  const keepPreset = Boolean(options.selectedProgressionId && options.newScale === options.currentScale)
  const nextChords = keepPreset
    ? createProgressionChords(
        options.selectedProgressionId!,
        options.newKey,
        options.totalBars,
        options.chordRegister,
        options.voicingStyle
      )
    : transposeChordProgression(
        options.chords,
        options.currentKey,
        options.currentScale,
        options.newKey,
        options.newScale,
        getDiatonicChords(options.newKey, options.newScale)
      )

  return { chords: nextChords, keepPreset }
}
