import type { RhythmPattern } from '@/models'
import { choose } from '@/utils/random-chooser'

/**
 * Generates a binary Euclidean pattern using Bjorklund's algorithm
 * @param pulses - Number of pulses (hits)
 * @param steps - Total number of steps
 * @returns Binary array where 1 = pulse, 0 = rest
 */
export function generateEuclideanBinaryPattern(pulses: number, steps: number): (0 | 1)[] {
  if (pulses > steps || pulses < 0 || steps <= 0) {
    return new Array(steps).fill(0)
  }
  if (pulses === 0) {
    return new Array(steps).fill(0)
  }

  // Build the binary pattern using Bjorklund's algorithm
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

  return [...p.flat()] as (0 | 1)[]
}

const DURATION_MAP: Readonly<Record<string, Readonly<Record<number, string>>>> = {
  '32n': { 1: '32n', 2: '16n', 3: '16n.', 4: '8n', 6: '8n.', 8: '4n', 12: '4n.', 16: '2n', 24: '2n.', 32: '1n' },
  '16n': { 1: '16n', 2: '8n', 3: '4n.', 4: '4n', 6: '4n.', 8: '2n', 12: '2n.', 16: '1n' },
  '8n': { 1: '8n', 2: '4n', 3: '4n.', 4: '2n', 6: '2n.', 8: '1n' },
  '4n': { 1: '4n', 2: '2n', 3: '2n.', 4: '1n' }
} as const

/**
 * Converts a list of multiples to actual note durations based on the subdivision.
 * @param multiples - List of multiples (e.g., [1, 2, 3])
 * @param subdivision - The note value for a single step (e.g., '16n')
 * @returns List of note durations (e.g., ['16n', '8n', '4n.'])
 */
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
    return { steps: [], pattern: [], subdivision }
  }
  if (pulses === 0) {
    return { steps: [], pattern: new Array(steps).fill(0), subdivision }
  }

  const binaryPattern = generateEuclideanBinaryPattern(pulses, steps)

  // Calculate durations based on intervals between pulses (like the original system)
  const hitIndices = binaryPattern.reduce((acc, val, i) => {
    if (val === 1) {
      acc.push(i)
    }
    return acc
  }, [] as number[])

  if (hitIndices.length === 0) {
    return { steps: [], pattern: [], subdivision }
  }

  // Calculate intervals between hits for durations
  const multiples: number[] = []
  for (let i = 0; i < hitIndices.length - 1; i++) {
    multiples.push(hitIndices[i + 1] - hitIndices[i])
  }

  // Handle the last note duration (wraps around to first note)
  const lastNoteDuration = steps - hitIndices[hitIndices.length - 1] + (hitIndices[0] ?? 0)
  multiples.push(lastNoteDuration)

  // Convert to actual durations
  const noteDurations = convertMultiplesToDurations(multiples, subdivision)

  // Create a steps array where each position gets the base subdivision,
  // but we'll store the actual note durations separately for the melody service to use
  const stepDurations: string[] = new Array(steps).fill(subdivision)

  return {
    steps: stepDurations,
    pattern: binaryPattern,
    subdivision,
    noteDurations
  }
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
  return generateEuclideanPattern(pulses, steps, '16n')
}
