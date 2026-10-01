import { Note } from 'tonal'
import { getScaleNotes } from '../theory/scale.engine'
import { getDiatonicChords } from '../theory/chord.engine'

/**
 * Generates pitch-class training sequences for a key and scale.
 *
 * @param root - Root note of the scale (e.g. 'C', 'F#')
 * @param scaleName - Scale type (e.g. 'major', 'minor', 'dorian')
 */
export function generateScaleTrainingSequences(root: string, scaleName: string): string[][] {
  const sequences: string[][] = []
  const scaleNotes = getScaleNotes(root, scaleName).map(toPitchClass)
  const len = scaleNotes.length

  if (len === 0) return [[toPitchClass(root)]]

  const tonic = scaleNotes[0]
  const tonicChroma = Note.chroma(tonic)
  const chromaOffsets = scaleNotes.map((note) => {
    const chroma = Note.chroma(note)
    return chroma === undefined || tonicChroma === undefined ? undefined : (chroma - tonicChroma + 12) % 12
  })
  const noteAtOffset = (offset: number): string | undefined => {
    const index = chromaOffsets.findIndex((candidate) => candidate === offset)
    return index < 0 ? undefined : scaleNotes[index]
  }

  // Ascending and descending runs make every scale degree observable.
  sequences.push([...scaleNotes, tonic])
  sequences.push([...scaleNotes].reverse().concat(tonic))

  for (let i = 0; i < len; i++) {
    sequences.push([scaleNotes[i], scaleNotes[(i + 1) % len], scaleNotes[(i + 2) % len]])
    sequences.push([scaleNotes[(i + 2) % len], scaleNotes[(i + 1) % len], scaleNotes[i]])
  }

  const triads =
    len === 7
      ? getDiatonicChords(root, scaleName).map((chord) => chord.triadNotes.map(toPitchClass))
      : getScaleTriads(scaleNotes, chromaOffsets)

  for (const triad of triads) {
    if (triad.length < 3) continue
    sequences.push([...triad, triad[0]])
    sequences.push([...triad].reverse().concat(tonic))
    sequences.push([triad[0], triad[1], triad[2], triad[1], triad[0]])
  }

  for (let i = 0; i < len; i++) {
    const note = scaleNotes[i]
    sequences.push([note, scaleNotes[(i + 1) % len], note])
    sequences.push([note, scaleNotes[(i - 1 + len) % len], note])
  }

  if (len >= 3) sequences.push([scaleNotes[1], scaleNotes[2], scaleNotes[1], tonic, scaleNotes[1]])

  // Dominant and leading-tone roles are defined by chromatic distance from tonic.
  const dominant = noteAtOffset(7)
  const leadingTone = noteAtOffset(11)
  if (dominant) {
    sequences.push([dominant, tonic])
    sequences.push([tonic, dominant, tonic])
    if (len >= 5) sequences.push([scaleNotes[1], dominant, tonic])
  }
  if (leadingTone) sequences.push([leadingTone, tonic])

  return sequences
}

function getScaleTriads(scaleNotes: string[], offsets: Array<number | undefined>): string[][] {
  const triads: string[][] = []
  const triadIntervals = [
    [4, 7],
    [3, 7],
    [3, 6]
  ]

  for (let rootIndex = 0; rootIndex < scaleNotes.length; rootIndex++) {
    const rootOffset = offsets[rootIndex]
    if (rootOffset === undefined) continue
    for (const [thirdInterval, fifthInterval] of triadIntervals) {
      const thirdIndex = offsets.findIndex((offset) => offset === (rootOffset + thirdInterval) % 12)
      const fifthIndex = offsets.findIndex((offset) => offset === (rootOffset + fifthInterval) % 12)
      if (thirdIndex < 0 || fifthIndex < 0) continue
      triads.push([scaleNotes[rootIndex], scaleNotes[thirdIndex], scaleNotes[fifthIndex]])
    }
  }

  return triads
}

function toPitchClass(pitch: string): string {
  return Note.pitchClass(pitch) || pitch.trim()
}
