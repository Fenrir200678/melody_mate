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
 * @returns The next chosen pitch.
 */
export function getNextPitch(
  state: string[],
  markovTable: MarkovTable,
  scale: AppScale,
  currentPitchForWeighting: string,
  degreeWeights?: Record<number, number>
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
    degreeWeights
  )

  return chooseWeighted(possibleNotes, weights)
}
