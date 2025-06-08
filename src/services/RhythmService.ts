import type { RhythmPattern } from '@/models'
import { chooseWeighted } from '@/utils/random'

const DEFAULT_NOTE_DURATIONS = ['4n', '8n', '16n']
const DEFAULT_WEIGHTS = [0.2, 0.5, 0.3]

/**
 * Generates a rhythm pattern by randomly selecting note durations.
 * The total duration of the pattern is not guaranteed to match a specific time signature.
 *
 * @param length - The number of notes in the pattern.
 * @param possibleDurations - The set of possible note durations to choose from.
 * @param weights - The corresponding weights for each duration.
 * @returns A RhythmPattern object.
 */
export function generatePattern(
  length: number,
  possibleDurations: string[] = DEFAULT_NOTE_DURATIONS,
  weights: number[] = DEFAULT_WEIGHTS
): RhythmPattern {
  if (possibleDurations.length !== weights.length) {
    throw new Error('Durations and weights must have the same length.')
  }

  const steps: string[] = []
  for (let i = 0; i < length; i++) {
    const duration = chooseWeighted(possibleDurations, weights)
    steps.push(duration)
  }

  return { steps, weights }
}

/**
 * A collection of predefined rhythm patterns for users to select.
 */
export const PREDEFINED_RHYTHMS: { name: string; pattern: RhythmPattern }[] = [
  {
    name: 'Four on the Floor',
    pattern: {
      steps: ['4n', '4n', '4n', '4n']
    }
  },
  {
    name: 'Eighth Note Groove',
    pattern: {
      steps: ['8n', '8n', '8n', '8n', '8n', '8n', '8n', '8n']
    }
  },
  {
    name: 'Basic Syncopation',
    pattern: {
      steps: ['8n', '16n', '16n', '8n', '8n', '16n', '16n', '8n', '4n']
    }
  },
  {
    name: 'Shuffle Feel',
    pattern: {
      steps: ['4n.', '8n', '4n.', '8n']
    }
  },
  {
    name: 'The Tresillo',
    pattern: {
      steps: ['4n.', '4n.', '4n']
    }
  },
  {
    name: 'Bossa Nova Bass',
    pattern: {
      steps: ['4n.', '8n', '2n']
    }
  },
  {
    name: 'Pop Ballad',
    pattern: {
      steps: ['8n', '8n', '8n', '8n', '4n', '4n']
    }
  }
]
