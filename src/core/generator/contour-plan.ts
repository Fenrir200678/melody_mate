import type { Contour } from '../schemas/generator.schema'
import { pitchToMidi } from '../theory/scale.engine'

export interface ContourFrame {
  progress: number
  minMidi: number
  maxMidi: number
}

export function planContourFrames(
  onsets: readonly { step: number }[],
  totalSteps: number,
  stepsPerBar: number,
  minMidi: number,
  maxMidi: number,
  targetOctave: number,
  contour: Contour
): ContourFrame[] {
  if (onsets.length === 0) return []

  const phraseSteps = Math.max(1, stepsPerBar * 2)
  const phraseCount = Math.max(1, Math.ceil(totalSteps / phraseSteps))
  const availableSpan = Math.max(0, maxMidi - minMidi)
  const contourSpan = Math.min(12, availableSpan)
  const centerMidi = Math.max(minMidi, Math.min(maxMidi, pitchToMidi(`C${targetOctave}`) + 6))
  const lowMidi = Math.max(minMidi, Math.min(maxMidi - contourSpan, centerMidi - contourSpan / 2))

  const phraseIndices = onsets.map((onset) => Math.min(phraseCount - 1, Math.floor(onset.step / phraseSteps)))
  const counts = new Array<number>(phraseCount).fill(0)
  for (const phraseIndex of phraseIndices) counts[phraseIndex]++

  const visited = new Array<number>(phraseCount).fill(0)
  return phraseIndices.map((phraseIndex) => {
    const noteIndex = visited[phraseIndex]++
    const progress = counts[phraseIndex] === 1 ? 0.5 : noteIndex / (counts[phraseIndex] - 1)
    let frameStart = lowMidi
    let frameEnd = lowMidi + contourSpan

    if (contour === 'ascending') {
      frameStart += (contourSpan * phraseIndex) / phraseCount
      frameEnd = lowMidi + (contourSpan * (phraseIndex + 1)) / phraseCount
    } else if (contour === 'descending') {
      frameStart += (contourSpan * (phraseCount - phraseIndex - 1)) / phraseCount
      frameEnd = lowMidi + (contourSpan * (phraseCount - phraseIndex)) / phraseCount
    }

    return { progress, minMidi: frameStart, maxMidi: frameEnd }
  })
}

export function scoreContour(
  candidate: { midi: number },
  progressRatio: number,
  contour: Contour,
  minMidi: number,
  maxMidi: number
): number {
  if (contour === 'free') return 0

  const progress = Math.max(0, Math.min(1, progressRatio))
  let targetHeight: number

  switch (contour) {
    case 'ascending':
      targetHeight = progress
      break
    case 'descending':
      targetHeight = 1 - progress
      break
    case 'arch':
      targetHeight = Math.sin(Math.PI * progress)
      break
    case 'valley':
      targetHeight = 1 - Math.sin(Math.PI * progress)
      break
  }

  const span = Math.max(1, maxMidi - minMidi)
  const idealMidi = minMidi + targetHeight * span
  const distance = Math.abs(candidate.midi - idealMidi)
  const halfRange = Math.max(3, span * 0.5)
  return Math.max(-1, Math.min(1, 1 - distance / halfRange))
}

export function scoreContourMotion(
  candidate: { midi: number },
  previousNote: { midi: number } | undefined,
  progress: number,
  contour: Contour
): number {
  if (!previousNote || contour === 'free' || progress <= 0) return 0

  const expectedDirection =
    contour === 'ascending' || (contour === 'arch' && progress <= 0.5) || (contour === 'valley' && progress > 0.5)
      ? 1
      : -1
  const movement = candidate.midi - previousNote.midi
  if (movement === 0) return 0

  return Math.sign(movement) === expectedDirection ? 0.4 : -0.25
}
