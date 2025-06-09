import type { Scale } from '@/ts/models'
import type { MarkovTable } from './markov'
import { getTransitions } from './markov'
import { choose, chooseWeighted } from './random-chooser'
import { applyMusicalWeighting } from './music-theory'

/**
 * Determines the next pitch in a melody using a Markov chain and musical weighting rules.
 * @param state - The current state (sequence of previous notes) to predict from.
 * @param markovTable - The pre-built Markov table to use for prediction.
 * @param scale - The musical scale to adhere to.
 * @param currentPitchForWeighting - The most recent pitch, used for weighting calculations.
 * @returns The next chosen pitch.
 */
export function getNextPitch(
  state: string[],
  markovTable: MarkovTable,
  scale: Scale,
  currentPitchForWeighting: string
): string {
  const transitions = getTransitions(markovTable, state)

  if (!transitions) {
    // Fallback if no transition is found for the current state
    return choose(scale.notes)
  }

  const { notes: possibleNotes, weights } = applyMusicalWeighting(transitions, currentPitchForWeighting, scale.notes)

  return chooseWeighted(possibleNotes, weights)
}
