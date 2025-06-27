import { STEPS_PER_16N, STEPS_PER_32N, STEPS_PER_4N, STEPS_PER_8N } from '@/ts/consts'

/**
 * Service for processing and normalizing rhythm patterns.
 */

/**
 * Normalizes a rhythm pattern by ensuring it has a proper pattern array and subdivision.
 * @param rhythm - The rhythm pattern to normalize.
 * @returns The normalized rhythm pattern.
 */
export function normalizeRhythm(rhythm: any): any {
  if (rhythm.pattern && rhythm.pattern.length > 0) {
    return { ...rhythm, subdivision: rhythm.subdivision || '16n' }
  }

  // Determine the subdivision for the pattern. Fallback to '16n' if not specified.
  const subdivision = rhythm.subdivision || '16n'

  const STEPS_MAPS = {
    '4n': STEPS_PER_4N,
    '8n': STEPS_PER_8N,
    '16n': STEPS_PER_16N,
    '32n': STEPS_PER_32N
  }
  const stepsMap = STEPS_MAPS[subdivision as keyof typeof STEPS_MAPS] || STEPS_PER_16N

  const pattern: (0 | 1)[] = []

  for (const duration of rhythm.steps) {
    const stepsForNote = stepsMap[duration as keyof typeof stepsMap] || 0
    if (stepsForNote > 0) {
      pattern.push(1)
      if (stepsForNote > 1) {
        pattern.push(...new Array(stepsForNote - 1).fill(0))
      }
    }
  }

  return {
    ...rhythm,
    pattern,
    subdivision
  }
}

/**
 * Extracts note steps from a rhythm pattern and total steps.
 * @param rhythmPattern - The rhythm pattern array.
 * @param totalSteps - Total number of steps.
 * @returns Array of step indices where notes should be played.
 */
export function extractNoteSteps(rhythmPattern: (0 | 1)[], totalSteps: number): number[] {
  const noteSteps: number[] = []
  for (let i = 0; i < totalSteps; i++) {
    if (rhythmPattern[i % rhythmPattern.length] === 1) {
      noteSteps.push(i)
    }
  }
  return noteSteps
}
