import { Note } from 'tonal'
import { getScaleMidiNotes, midiToPitch, pitchToMidi } from '../theory/scale.engine'

export interface StructuredPitchOptions {
  root: string
  scaleName: string
  minOctave: number
  maxOctave: number
  chordNotes: readonly string[]
  emphasizeChord: boolean
  chordAdherence: number
  pentatonicMode: boolean
  history: readonly { midi: number }[]
  rng: () => number
}

// A third consecutive repeat stays possible as a deliberate hook, but quantization
// must not stack them by default; from the fourth note on the run always breaks.
const THIRD_REPEAT_PROBABILITY = 0.25

/** Keeps phrase quantization from erasing motion or trapping notes at register edges. */
export function resolveStructuredPitch(midi: number, options: StructuredPitchOptions): { pitch: string; midi: number } {
  const minMidi = pitchToMidi(`C${Math.min(options.minOctave, options.maxOctave)}`)
  const maxMidi = pitchToMidi(`B${Math.max(options.minOctave, options.maxOctave)}`)
  const scale = getScaleMidiNotes(options.root, options.scaleName).filter(
    (candidate) => candidate >= minMidi && candidate <= maxMidi
  )
  const chordChromas = new Set(options.chordNotes.map((note) => Note.chroma(note)))
  const adherence = Math.max(0, Math.min(1, options.chordAdherence))
  const chordCandidates = Array.from({ length: maxMidi - minMidi + 1 }, (_, index) => minMidi + index).filter(
    (candidate) => chordChromas.has(candidate % 12) && (!options.pentatonicMode || scale.includes(candidate))
  )
  const anchor =
    options.emphasizeChord &&
    chordCandidates.length > 0 &&
    (adherence === 1 || (adherence > 0 && options.rng() < adherence))
  const candidates = anchor
    ? chordCandidates
    : !options.pentatonicMode && chordCandidates.includes(midi) && !scale.includes(midi)
      ? [...scale, midi].sort((a, b) => a - b)
      : scale
  let repeatedMidi: number | undefined
  const lastMidi = options.history[options.history.length - 1]?.midi
  if (lastMidi !== undefined) {
    let runLength = 0
    for (let index = options.history.length - 1; index >= 0 && options.history[index].midi === lastMidi; index--) {
      runLength++
    }
    // Three repetitions can carry a hook; further quantized repetitions should
    // yield to another nearby scale/chord tone when the register allows it.
    if (runLength >= 3 || (runLength === 2 && options.rng() >= THIRD_REPEAT_PROBABILITY)) {
      repeatedMidi = lastMidi
    }
  }
  const moving = candidates.filter((candidate) => candidate !== repeatedMidi)
  const scaleAlternatives = scale.filter((candidate) => candidate !== repeatedMidi)
  const pool = moving.length > 0 ? moving : scaleAlternatives.length > 0 ? scaleAlternatives : candidates
  const target = pool.reduce(
    (closest, candidate) => (Math.abs(candidate - midi) < Math.abs(closest - midi) ? candidate : closest),
    pool[0] ?? Math.max(minMidi, Math.min(maxMidi, midi))
  )
  return { pitch: midiToPitch(target), midi: target }
}
