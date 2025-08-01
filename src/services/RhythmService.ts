import type { EuclideanRhythm } from '@/ts/types/rhythm.types'

/**
 * Generates a rhythm pattern using a Euclidean algorithm to create musically pleasing distributions.
 *
 * @param pulses - The number of notes (on-beats) to distribute in the pattern.
 * @param steps - The total number of steps in the pattern (e.g., 16 for a bar of 16th notes).
 * @param subdivision - The note value for a single step (e.g., '16n').
 * @param rotation - The number of steps to rotate the pattern (default is 0, no rotation).
 * @returns A RhythmPattern object.
 */
export function generateEuclideanPattern(
  pulses: number,
  steps: number,
  subdivision: string = '16n',
  rotation: number = 0
): EuclideanRhythm {
  const emptyPattern: EuclideanRhythm = {
    name: 'Empty',
    pulses: 0,
    category: 'euclidean' as const,
    pattern: new Array(steps).fill(0),
    subdivision
  }

  if (pulses > steps || pulses < 0 || steps <= 0) {
    return emptyPattern
  }
  if (pulses === 0) {
    return { ...emptyPattern, pattern: new Array(steps).fill(0) }
  }

  const unrotatedBinaryPattern = _generateEuclideanBinaryPattern(pulses, steps)
  const binaryPattern = rotateArray(unrotatedBinaryPattern, rotation)

  return {
    name: `Euclidean ${pulses}/${steps}`,
    pulses,
    category: 'euclidean',
    pattern: binaryPattern,
    subdivision
  }
}

/**
 * Rotates the pattern. Positive amount rotates left, negative rotates right.
 * @param pattern The pattern to rotate
 * @param amount The amount to rotate by
 * @returns The rotated pattern
 */
function rotateArray<T>(pattern: T[], amount: number): T[] {
  const len = pattern.length
  if (len === 0 || amount === 0) {
    return pattern
  }
  // This calculates a left rotation.
  // A positive amount will shift elements to the left.
  // e.g., rotate([1,2,3,4], 1) => [2,3,4,1]
  const offset = ((amount % len) + len) % len
  if (offset === 0) return pattern
  return [...pattern.slice(offset), ...pattern.slice(0, offset)]
}

/**
 * Generates a binary Euclidean pattern using Bresenham's line algorithm
 * @param pulses - Number of pulses (hits)
 * @param steps - Total number of steps
 * @returns Binary array where 1 = pulse, 0 = rest
 */
function _generateEuclideanBinaryPattern(pulses: number, steps: number): (0 | 1)[] {
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
