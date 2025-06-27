import type { Melody } from '@/ts/models'
import type { MelodyGenerationContext } from '../melody.types'
import { generateNotesForSteps } from '../note-generator.service'
import { extendRhythmToMultipleBars } from '@/utils/rhythm-converter'

/**
 * Service responsible for generating standard melodies based on a UnifiedRhythm.
 */
export class StandardMelodyGenerator {
  /**
   * Generates a standard melody by repeating the rhythm pattern over multiple bars.
   * @param context - The melody generation context containing the UnifiedRhythm.
   * @returns The generated melody.
   */
  generate(context: MelodyGenerationContext): Melody {
    // Calculate number of bars for this context
    const bars = Math.ceil(context.totalSteps / context.stepsPerBar)

    // Extend the single-bar rhythm to multiple bars for standard generation
    const multiBarRhythm = extendRhythmToMultipleBars(context.unifiedRhythm, bars)

    // Create a new context with the multi-bar rhythm
    const extendedContext: MelodyGenerationContext = {
      ...context,
      unifiedRhythm: multiBarRhythm
    }

    const result = generateNotesForSteps(extendedContext)

    return {
      notes: result.notes
    }
  }
}
