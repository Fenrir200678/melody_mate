import type { Melody } from '@/ts/models'
import { _generateMelody } from '@/services/melody/melody-generator.service'

/**
 * Main MelodyService facade that provides melody generation functionality.
 */

/**
 * Generates a melody based on the given scale, rhythm, and parameters.
 * @returns Promise that resolves to the generated melody.
 */
export async function generateMelody(): Promise<Melody> {
  return _generateMelody()
}

/**
 * Legacy synchronous wrapper (deprecated)
 * @deprecated Use generateMelody() async version instead
 */
export function generateMelodySync(): Promise<Melody> {
  return generateMelody()
}
