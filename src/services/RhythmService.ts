import type { RhythmPattern } from '@/ts/models'
import { DURATION_MAP } from '@/ts/consts'
import { choose } from '@/utils/random-chooser'

/**
 * Rotates an array. Positive amount rotates left, negative rotates right.
 * @param arr The array to rotate
 * @param amount The amount to rotate by
 * @returns The rotated array
 */
function rotateArray<T>(arr: T[], amount: number): T[] {
  const len = arr.length
  if (len === 0 || amount === 0) {
    return arr
  }
  // This calculates a left rotation.
  // A positive amount will shift elements to the left.
  // e.g., rotate([1,2,3,4], 1) => [2,3,4,1]
  const offset = ((amount % len) + len) % len
  if (offset === 0) return arr
  return [...arr.slice(offset), ...arr.slice(0, offset)]
}

/**
 * Generates a binary Euclidean pattern using Bresenham's line algorithm
 * @param pulses - Number of pulses (hits)
 * @param steps - Total number of steps
 * @returns Binary array where 1 = pulse, 0 = rest
 */
export function generateEuclideanBinaryPattern(pulses: number, steps: number): (0 | 1)[] {
  if (pulses < 0 || steps <= 0 || pulses > steps) {
    return []
  }

  const pattern: (0 | 1)[] = new Array(steps).fill(0)
  if (pulses === 0) {
    return pattern
  }

  // This is a Bresenham-line-based algorithm that creates "rear-loaded" patterns,
  // which often feel more rhythmically conventional and resolving.
  let bucket = 0
  for (let i = 0; i < steps; i++) {
    bucket += pulses
    if (bucket >= steps) {
      bucket -= steps
      pattern[i] = 1
    }
  }
  return pattern
}

/**
 * Converts a list of multiples to actual note durations based on the subdivision.
 * @param multiples - List of multiples (e.g., [1, 2, 3])
 * @param subdivision - The note value for a single step (e.g., '16n')
 * @returns List of note durations (e.g., ['16n', '8n', '4n.'])
 */
function convertMultiplesToDurations(multiples: number[], subdivision: string): string[] {
  const mapForSubdivision = DURATION_MAP[subdivision as keyof typeof DURATION_MAP]
  if (!mapForSubdivision) {
    console.error(`Unsupported subdivision for duration conversion: ${subdivision}`)
    return multiples.map((m) => `${m}*${subdivision}`)
  }

  return multiples.map((m) => {
    return mapForSubdivision[m as keyof typeof mapForSubdivision] ?? `${m}*${subdivision}`
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
export function generateEuclideanPattern(
  pulses: number,
  steps: number,
  subdivision: string = '16n',
  rotation: number = 0
): RhythmPattern {
  if (pulses > steps || pulses < 0 || steps <= 0) {
    return { steps: [], pattern: [], subdivision, pulses: 0, name: 'Empty' }
  }
  if (pulses === 0) {
    return { steps: [], pattern: new Array(steps).fill(0), subdivision, pulses: 0, name: 'Empty' }
  }

  const unrotatedBinaryPattern = generateEuclideanBinaryPattern(pulses, steps)
  const binaryPattern = rotateArray(unrotatedBinaryPattern, rotation)

  // Calculate durations based on intervals between pulses (like the original system)
  const hitIndices = binaryPattern.reduce((acc, val, i) => {
    if (val === 1) {
      acc.push(i)
    }
    return acc
  }, [] as number[])

  if (hitIndices.length === 0) {
    return { steps: [], pattern: [], subdivision, pulses: 0, name: 'Empty' }
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
    name: `Euclidean ${pulses}/${steps}`,
    steps: stepDurations,
    pattern: binaryPattern,
    subdivision,
    noteDurations,
    pulses
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
