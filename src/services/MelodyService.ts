import type { Melody } from '@/ts/models'
import { _generateMelody } from './melody/melody-generator.service'

/**
 * Main MelodyService facade that provides melody generation functionality.
 */

/**
 * Generates a melody based on the given scale, rhythm, and parameters.
 * @returns The generated melody.
 */
export function generateMelody(): Melody {
  return _generateMelody()
}
