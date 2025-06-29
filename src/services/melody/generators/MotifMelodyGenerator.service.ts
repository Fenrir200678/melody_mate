import type { Melody, AppNote } from '@/ts/models'
import type { MelodyGenerationContext, NoteGenerationResult } from '../melody.types'
import { generateNotesForSteps } from '../note-generator.service'
import { getRandomMotifPattern } from '../motif.service'

/**
 * Service responsible for generating motif-based melodies with repetition patterns
 */
export class MotifMelodyGenerator {
  /**
   * Generates a melody based on a randomly selected 4-bar motif pattern.
   * The pattern (e.g., 'ABAB', 'AABC') determines the repetition structure.
   * @param context - The melody generation context.
   * @returns The generated melody.
   */
  generate(context: MelodyGenerationContext): Melody {
    const { unifiedRhythm } = context
    const pattern = context.useRandomMotifPattern ? getRandomMotifPattern() : context.motifRepetitionPattern
    const generatedBars = new Map<string, NoteGenerationResult>()
    const melodyNotes: AppNote[] = []
    let lastPitch: string | undefined

    for (let i = 0; i < 4; i++) {
      const patternChar = pattern[i]
      let barResult: NoteGenerationResult | undefined = generatedBars.get(patternChar)

      if (barResult) {
        // If this bar has been generated before (repetition), just reuse it
        // Call & Response will be applied later in the MelodyOrchestrator
      } else {
        // If this is a new bar, generate it

        // For motif generation, we use the original 1-bar rhythm for each bar
        // instead of trying to filter by absolute step positions

        if (unifiedRhythm.events.length > 0) {
          const barContext: MelodyGenerationContext = {
            ...context,
            unifiedRhythm: {
              ...unifiedRhythm,
              // Keep the original 1-bar rhythm events and totalSteps
              events: unifiedRhythm.events,
              totalSteps: unifiedRhythm.totalSteps
            },
            totalSteps: unifiedRhythm.totalSteps
          }
          barResult = generateNotesForSteps(barContext, lastPitch, context.melodicContour)
        } else {
          barResult = { notes: [], lastPitch: lastPitch || context.scale.notes[0] }
        }
        generatedBars.set(patternChar, barResult)
      }

      if (barResult && barResult.notes.length > 0) {
        melodyNotes.push(...barResult.notes)
        lastPitch = barResult.lastPitch
      }
    }

    return { notes: melodyNotes }
  }

  /**
   * Checks if this generator can handle the given context
   * @param context - The melody generation context
   * @returns true if this generator can handle the context
   */
  canHandle(context: MelodyGenerationContext): boolean {
    return context.unifiedRhythm.events.length > 0
  }
}
