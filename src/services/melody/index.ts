/**
 * Index file for melody generation services.
 * Exports all the individual services for easy importing.
 */

// Main melody generation
export { generateMelody } from './melody-generator.service'

// Individual service exports for advanced usage
export { createTrainingData } from './training-data.service'
export { normalizeRhythm, extractNoteSteps } from './rhythm-processor.service'
export { convertStepsToDuration, getStepsPerBar } from './duration.service'
export { generateNotesForSteps } from './note-generator.service'
export { getPitchWithOctave } from './pitch-utils.service'
export type {
  MelodyGenerationOptions,
  NoteGenerationOptions,
  MelodyGenerationContext,
  NoteGenerationResult
} from './melody.types'
