import type { Melody } from '@/ts/models'
import { MelodyOrchestrator } from './core/MelodyOrchestrator.service'

// Create singleton instance of MelodyOrchestrator
const melodyOrchestrator = new MelodyOrchestrator()

/**
 * Main service for generating complete melodies using the new modular architecture.
 * This function replaces the old monolithic melody generation logic.
 * @returns The generated melody.
 */
export async function _generateMelody(): Promise<Melody> {
  const result = await melodyOrchestrator.generateMelody()
  if (result.success) {
    return result.data
  }
  throw new Error('Failed to generate melody')
}

/**
 * Legacy wrapper for the new melody generation system
 * @deprecated Use MelodyOrchestrator directly for better async support
 */
export async function generateMelodyAsync(): Promise<Melody> {
  return melodyOrchestrator.generateMelodyLegacy()
}

/**
 * Export the orchestrator for direct use in components
 */
export { MelodyOrchestrator }
