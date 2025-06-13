import type { Melody } from '@/ts/models'
import type { MelodyGenerationOptions } from './melody/melody.types'
import { generateMelody as generateMelodyInternal } from './melody'

/**
 * Main MelodyService that provides melody generation functionality.
 * This service now uses the refactored melody generation modules.
 */

/**
 * Generates a melody based on the given scale, rhythm, and parameters.
 * @param options - The melody generation options.
 * @returns The generated melody.
 */
export function generateMelody(options: MelodyGenerationOptions): Melody {
  return generateMelodyInternal(options)
}

// Re-export individual services for advanced usage
export {
  createTrainingData,
  normalizeRhythm,
  extractNoteSteps,
  convertStepsToDuration,
  getStepsPerBar,
  generateNotesForSteps,
  getPitchWithOctave
} from './melody'

export type { NoteGenerationOptions } from './melody/melody.types'
