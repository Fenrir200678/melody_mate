import type { AppScale } from '@/ts/models'
import type { MarkovTable } from './markov'
import { getTransitions } from './markov'
import { choose, chooseWeighted } from './random-chooser'
import { applyMusicalWeighting } from './music-theory'

/**
 * Determines the next pitch in a melody using a Markov chain and musical weighting rules.
 * @param state - The current state (sequence of previous notes) to predict from.
 * @param markovTable - The pre-built Markov table to use for prediction.
 * @param scale - The musical AppScale to adhere to.
 * @param currentPitchForWeighting - The most recent pitch, used for weighting calculations.
 * @param degreeWeights - Optional rhythm-specific degree weights.
 * @param melodicContour - Optional melodic contour for weighting adjustments.
 * @returns The next chosen pitch.
 */
export function getNextPitch(
  state: string[],
  markovTable: MarkovTable,
  scale: AppScale,
  currentPitchForWeighting: string,
  degreeWeights?: Record<number, number>,
  currentChordNotes?: readonly string[],
  melodyProgress?: number,
  currentStep?: number,
  subdivision?: string,
  melodicContour?: string
): string {
  const transitions = getTransitions(markovTable, state)

  if (!transitions) {
    // Fallback if no transition is found for the current state
    return choose(scale.notes)
  }

  const { notes: possibleNotes, weights } = applyMusicalWeighting(
    transitions,
    currentPitchForWeighting,
    scale.notes,
    degreeWeights,
    currentChordNotes,
    melodyProgress,
    currentStep,
    subdivision
  )

  // Filter out notes that are not in the current scale
  const filteredNotes: string[] = []
  const filteredWeights: number[] = []

  // Determine current pitch index in scale
  const currentIdx = scale.notes.indexOf(currentPitchForWeighting)

  // Bias strength (0.0 = kein Bias, 1.0 = maximaler Bias)
  let biasStrength = 0.5
  if (melodicContour === 'arc') {
    if (melodyProgress !== undefined) {
      biasStrength = 0.7
    }
  } else if (melodicContour === 'ascending' || melodicContour === 'descending') {
    biasStrength = 0.7
  }

  for (let i = 0; i < possibleNotes.length; i++) {
    const note = possibleNotes[i]
    const baseWeight = weights[i]
    const noteIdx = scale.notes.indexOf(note)
    let bias = 1

    if (melodicContour && currentIdx !== -1 && noteIdx !== -1) {
      if (melodicContour === 'arc' && melodyProgress !== undefined) {
        // Erste Hälfte: aufwärts bevorzugen, zweite Hälfte: abwärts
        if (melodyProgress < 0.5) {
          if (noteIdx > currentIdx) bias += biasStrength
          if (noteIdx < currentIdx) bias -= biasStrength / 2
        } else {
          if (noteIdx < currentIdx) bias += biasStrength
          if (noteIdx > currentIdx) bias -= biasStrength / 2
        }
      } else if (melodicContour === 'ascending') {
        if (noteIdx > currentIdx) bias += biasStrength
        if (noteIdx < currentIdx) bias -= biasStrength / 2
      } else if (melodicContour === 'descending') {
        if (noteIdx < currentIdx) bias += biasStrength
        if (noteIdx > currentIdx) bias -= biasStrength / 2
      }
      // random: kein Bias
    }
    filteredNotes.push(note)
    filteredWeights.push(Math.max(0.01, baseWeight * bias))
  }

  if (filteredNotes.length === 0) {
    // Fallback: if no valid notes remain after filtering, choose randomly from the scale
    return choose(scale.notes)
  }

  return chooseWeighted(filteredNotes, filteredWeights)
}
