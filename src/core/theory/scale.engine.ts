import { Note, Scale, ScaleType } from 'tonal'

export interface ScaleDefinition {
  id: string
  name: string
  category: 'standard' | 'mode' | 'jazz_blues' | 'pentatonic' | 'symmetric_exotic'
}

export const SUPPORTED_SCALES: readonly ScaleDefinition[] = [
  // Standard
  { id: 'major', name: 'Major', category: 'standard' },
  { id: 'minor', name: 'Minor', category: 'standard' },
  { id: 'harmonic minor', name: 'Harmonic Minor', category: 'standard' },
  { id: 'melodic minor', name: 'Melodic Minor', category: 'standard' },

  // Modes of Major
  { id: 'dorian', name: 'Dorian', category: 'mode' },
  { id: 'phrygian', name: 'Phrygian', category: 'mode' },
  { id: 'lydian', name: 'Lydian', category: 'mode' },
  { id: 'mixolydian', name: 'Mixolydian', category: 'mode' },
  { id: 'locrian', name: 'Locrian', category: 'mode' },

  // Jazz & Blues
  { id: 'bebop major', name: 'Bebop Major', category: 'jazz_blues' },
  { id: 'bebop minor', name: 'Bebop Minor', category: 'jazz_blues' },
  { id: 'blues', name: 'Blues', category: 'jazz_blues' },

  // Pentatonic
  { id: 'major pentatonic', name: 'Major Pentatonic', category: 'pentatonic' },
  { id: 'minor pentatonic', name: 'Minor Pentatonic', category: 'pentatonic' },

  // Symmetric & Exotic
  { id: 'whole tone', name: 'Whole Tone', category: 'symmetric_exotic' },
  { id: 'whole-half diminished', name: 'Whole-Half Diminished', category: 'symmetric_exotic' },
  { id: 'half-whole diminished', name: 'Half-Whole Diminished', category: 'symmetric_exotic' },
  { id: 'hungarian minor', name: 'Hungarian Minor', category: 'symmetric_exotic' },
  { id: 'phrygian dominant', name: 'Phrygian Dominant', category: 'symmetric_exotic' },
  { id: 'double harmonic major', name: 'Double Harmonic Major', category: 'symmetric_exotic' },
  { id: 'ichikosucho', name: 'Ichikosucho', category: 'symmetric_exotic' }
] as const

export type SupportedScaleId = (typeof SUPPORTED_SCALES)[number]['id']

/**
 * Normalizes user-supplied scale names to match Tonal dictionary keys.
 */
function normalizeScaleName(scaleName: string): string {
  return scaleName.trim().toLowerCase()
}

/**
 * Resolves the corresponding 5-note pentatonic scale for any given scale or mode.
 * Uses Tonal's Scale.reduced to find subset pentatonics, falling back to interval quality.
 */
export function getPentatonicEquivalent(scaleName: string): 'major pentatonic' | 'minor pentatonic' {
  const normalized = normalizeScaleName(scaleName)
  if (normalized === 'major pentatonic' || normalized === 'minor pentatonic') {
    return normalized
  }

  const reduced = Scale.reduced(normalized)
  if (reduced.includes('minor pentatonic')) return 'minor pentatonic'
  if (reduced.includes('major pentatonic')) return 'major pentatonic'

  const intervals = ScaleType.get(normalized).intervals
  return intervals.includes('3m') ? 'minor pentatonic' : 'major pentatonic'
}

/**
 * Returns the note names for a given root note and scale name.
 * If the root includes an octave (e.g. 'C4'), notes include their respective octaves.
 */
export function getScaleNotes(root: string, scaleName: string): string[] {
  const normalized = normalizeScaleName(scaleName)
  const scale = Scale.get(`${root} ${normalized}`)
  return scale.notes
}

/**
 * Checks whether a given pitch belongs to the designated scale.
 * Compares pitch chroma to handle enharmonic equivalents (e.g. F# vs Gb).
 */
export function isNoteInScale(pitch: string, root: string, scaleName: string): boolean {
  const pitchChroma = Note.chroma(pitch)
  if (pitchChroma === undefined) return false

  const scaleNotes = getScaleNotes(root, scaleName)
  const scaleChromas = new Set(scaleNotes.map((note) => Note.chroma(note)))
  return scaleChromas.has(pitchChroma)
}

/**
 * Returns the 1-based scale degree of a given pitch within the scale (e.g. 1 for tonic),
 * or null if the pitch is non-diatonic / out of scale.
 */
export function getScaleDegree(pitch: string, root: string, scaleName: string): number | null {
  const targetPc = Note.pitchClass(pitch)
  const targetChroma = Note.chroma(pitch)
  if (targetChroma === undefined) return null

  const scaleNotes = getScaleNotes(root, scaleName)

  // First check direct pitch-class equality to respect harmonic spelling
  const exactIndex = scaleNotes.findIndex((note) => Note.pitchClass(note) === targetPc)
  if (exactIndex !== -1) {
    return exactIndex + 1
  }

  // Fallback to chroma matching for enharmonic spellings
  const chromaIndex = scaleNotes.findIndex((note) => Note.chroma(note) === targetChroma)
  if (chromaIndex !== -1) {
    return chromaIndex + 1
  }

  return null
}

/**
 * Converts a pitch string to its MIDI number (0–127).
 * Assumes octave 4 if none is specified.
 */
export function pitchToMidi(pitch: string): number {
  const parsed = Note.get(pitch)
  if (parsed.midi !== null) {
    return Math.max(0, Math.min(127, parsed.midi))
  }

  // If no octave was provided, default to middle octave 4
  const withDefaultOctave = Note.get(`${parsed.pc || pitch}4`)
  if (withDefaultOctave.midi !== null) {
    return Math.max(0, Math.min(127, withDefaultOctave.midi))
  }

  return 60
}

/**
 * Converts a MIDI number (0–127) to standard pitch notation with octave.
 */
export function midiToPitch(midi: number): string {
  const clamped = Math.max(0, Math.min(127, Math.round(midi)))
  return Note.fromMidi(clamped)
}

const SHARP_PREFERRED_SPELLING: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
  'E#': 'F',
  'B#': 'C',
  Cb: 'B',
  Fb: 'E'
}

/**
 * Rewrites a pitch to its sharp-preferred enharmonic spelling, keeping the octave suffix.
 * Keyboard geometry is generated from sharp names only, so flat spellings such as 'Db3'
 * must be folded onto 'C#3' before they can be matched against a rendered key.
 */
export function normalizeEnharmonic(pitch: string): string {
  const match = pitch.match(/^([A-G][b#]?)(.*)$/)
  if (!match) return pitch
  const [, note, rest] = match
  return `${SHARP_PREFERRED_SPELLING[note] ?? note}${rest}`
}

/**
 * Snaps any pitch to the nearest scale pitch in semitone distance.
 * If equidistant, resolves downward to maintain stable register boundaries.
 */
export function snapPitchToScale(pitch: string, root: string, scaleName: string): string {
  const rootPc = Note.pitchClass(root) || root
  const rootScaleNotes = getScaleNotes(rootPc, scaleName)
  if (rootScaleNotes.length === 0) return pitch

  const inputMidi = pitchToMidi(pitch)
  const inputOctave = Note.get(pitch).oct

  // Search candidate scale pitches across the adjacent octaves to cover chromatic boundary wrap
  let closestPitch = pitch
  let minDistance = Infinity

  for (let octave = 0; octave <= 9; octave++) {
    for (const notePc of rootScaleNotes) {
      const candidatePitch = `${notePc}${octave}`
      const candidateMidi = pitchToMidi(candidatePitch)
      const distance = Math.abs(candidateMidi - inputMidi)

      if (distance < minDistance) {
        minDistance = distance
        closestPitch = inputOctave !== undefined ? candidatePitch : notePc
      }
    }
  }

  return closestPitch
}

/**
 * Snaps a MIDI number to the nearest in-scale MIDI number, preserving the octave/register.
 * Powers the piano-roll "Scale Lock": edits (create/drag/clone) can never land on a
 * non-scale semitone; the target is pulled to the closest scale pitch instead.
 */
export function snapMidiToScale(midi: number, root: string, scaleName: string): number {
  const pitch = midiToPitch(midi)
  const snappedPitch = snapPitchToScale(pitch, root, scaleName)
  return pitchToMidi(snappedPitch)
}

/** Ordered MIDI scale pitches allow diatonic walks across octave boundaries. */
export function getScaleMidiNotes(root: string, scaleName: string): number[] {
  const chromas = new Set(getScaleNotes(root, scaleName).map((pitch) => Note.chroma(pitch)))
  return Array.from({ length: 128 }, (_, midi) => midi).filter((midi) => chromas.has(midi % 12))
}

/**
 * Transposes a MIDI note by diatonic scale degrees within a given scale.
 * If steps > 0, moves to the next scale pitch(es) ascending.
 * If steps < 0, moves to the previous scale pitch(es) descending.
 * Clamps result strictly within [0, 127].
 */
export function transposeMidiInScale(midi: number, scaleSteps: number, root: string, scaleName: string): number {
  if (scaleSteps === 0) return midi
  const scaleMidis = getScaleMidiNotes(root, scaleName)
  if (scaleMidis.length === 0) {
    return Math.max(0, Math.min(127, midi + scaleSteps))
  }

  let current = Math.max(0, Math.min(127, Math.round(midi)))

  if (scaleSteps > 0) {
    for (let step = 0; step < scaleSteps; step++) {
      const next = scaleMidis.find((m) => m > current)
      if (next !== undefined && next <= 127) {
        current = next
      } else {
        break
      }
    }
  } else {
    const stepsCount = Math.abs(scaleSteps)
    for (let step = 0; step < stepsCount; step++) {
      let prev: number | undefined
      for (let i = scaleMidis.length - 1; i >= 0; i--) {
        if (scaleMidis[i] < current) {
          prev = scaleMidis[i]
          break
        }
      }
      if (prev !== undefined && prev >= 0) {
        current = prev
      } else {
        break
      }
    }
  }

  return current
}
