import type { RhythmPattern } from '@/models'
import { choose } from '@/utils/random'

const DURATION_MAP: Readonly<Record<string, Readonly<Record<number, string>>>> = {
  '32n': { 1: '32n', 2: '16n', 3: '16n.', 4: '8n', 6: '8n.', 8: '4n', 12: '4n.', 16: '2n', 24: '2n.', 32: '1n' },
  '16n': { 1: '16n', 2: '8n', 3: '8n.', 4: '4n', 6: '4n.', 8: '2n', 12: '2n.', 16: '1n' },
  '8n': { 1: '8n', 2: '4n', 3: '4n.', 4: '2n', 6: '2n.', 8: '1n' },
  '4n': { 1: '4n', 2: '2n', 3: '2n.', 4: '1n' }
} as const

function convertMultiplesToDurations(multiples: number[], subdivision: string): string[] {
  const mapForSubdivision = DURATION_MAP[subdivision]
  if (!mapForSubdivision) {
    console.error(`Unsupported subdivision for duration conversion: ${subdivision}`)
    return multiples.map((m) => `${m}*${subdivision}`)
  }

  return multiples.map((m) => {
    return mapForSubdivision[m] ?? `${m}*${subdivision}`
  })
}

/**
 * Generates a rhythm pattern using a Euclidean algorithm to create musically pleasing distributions.
 *
 * @param pulses - The number of notes (on-beats) to distribute in the pattern.
 * @param steps - The total number of steps in the pattern (e.g., 16 for a bar of 16th notes).
 * @param subdivision - The note value for a single step (e.g., '16n').
 * @returns A RhythmPattern object.
 */
export function generateEuclideanPattern(pulses: number, steps: number, subdivision: string = '16n'): RhythmPattern {
  if (pulses > steps || pulses < 0 || steps <= 0) {
    return { steps: [] }
  }
  if (pulses === 0) {
    return { steps: [] }
  }

  // Build the binary pattern using a correct implementation of Bjorklund's algorithm
  const k = pulses
  const n = steps
  const p: (number | number[])[][] = []
  for (let i = 0; i < k; i++) p.push([1])
  const q: (number | number[])[][] = []
  for (let i = 0; i < n - k; i++) q.push([0])

  while (q.length > 0) {
    const p_len = p.length
    for (let i = 0; i < Math.min(p_len, q.length); i++) {
      p[i] = p[i].concat(q[i])
    }
    q.splice(0, p_len)
  }

  const binaryPattern = [].concat.apply([], p as any) as (0 | 1)[]

  const hitIndices = binaryPattern.reduce((acc, val, i) => {
    if (val === 1) {
      acc.push(i)
    }
    return acc
  }, [] as number[])

  if (hitIndices.length === 0) {
    return { steps: [] }
  }

  const multiples: number[] = []
  for (let i = 0; i < hitIndices.length - 1; i++) {
    multiples.push(hitIndices[i + 1] - hitIndices[i])
  }

  const lastNoteDuration = steps - hitIndices[hitIndices.length - 1] + (hitIndices[0] ?? 0)
  multiples.push(lastNoteDuration)

  const generatedSteps = convertMultiplesToDurations(multiples, subdivision)

  return { steps: generatedSteps }
}

/**
 * Generates a rhythm pattern by creating a musically coherent Euclidean pattern
 * with a random number of pulses and steps.
 *
 * @param length - The approximate number of notes desired in the pattern.
 * @returns A RhythmPattern object.
 */
export function generatePattern(length: number): RhythmPattern {
  // Ensure we have a reasonable number of pulses and steps
  const pulses = length > 2 ? Math.floor(length / 2) + choose([0, 1, 2]) : length
  const steps = length * 2

  if (pulses > steps) {
    // Fallback for simple cases
    return { steps: new Array(length).fill('8n') }
  }

  const pattern = generateEuclideanPattern(pulses, steps, '16n')

  // The raw euclidean pattern might be too sparse, let's try to convert it
  // into a more playable sequence of durations. This is a complex problem.
  // For now, we return the direct pattern, but a future improvement would be
  // to implement a function that groups rests into the previous note's duration.
  // e.g., [1, 0, 0, 1, ...] -> ['4n.', ...]

  return pattern
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
    name: 'The Tresillo', // E(3, 8)
    pattern: {
      steps: ['8n.', '8n.', '4n']
    }
  },
  {
    name: 'Basic Syncopation',
    pattern: {
      steps: ['8n', '16n', '16n', '8n', '8n', '16n', '16n', '8n', '4n']
    }
  },
  {
    name: 'Funky Drummer',
    pattern: {
      steps: ['16n', '16n', '8n', '16n', '16n', '8n', '16n', '16n', '8n', '8n']
    }
  },
  {
    name: 'Bossa Nova Bass',
    pattern: {
      steps: ['4n.', '8n', '4n.', '8n'] // Simplified
    }
  },
  {
    name: 'Habanera',
    pattern: {
      steps: ['8n', '16n', '16n', '8n', '8n']
    }
  },
  {
    name: 'Clavé Son (3-2)',
    pattern: {
      steps: ['8n.', '8n.', '4n', '8n', '8n']
    }
  },
  {
    name: 'Pop Ballad',
    pattern: {
      steps: ['8n', '8n', '8n', '8n', '4n', '4n']
    }
  }
]
