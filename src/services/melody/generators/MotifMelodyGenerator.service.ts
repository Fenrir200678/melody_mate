import type { Melody, AppNote } from '@/ts/models'
import type { MelodyGenerationContext, NoteGenerationResult } from '../melody.types'
import { generateNotesForSteps } from '../note-generator.service'
import { getRandomMotifPattern } from '../motif.service'
import { transposeMelody, invertMelody, transposeMelodyDiatonically } from '../motif-transformer.service'
import { mapMelodyToScale } from '@/utils/scales'
import { useGenerationStore } from '@/stores/generation.store'

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
    const { unifiedRhythm, scale } = context
    const { useCallAndResponse } = useGenerationStore()
    const pattern = context.useRandomMotifPattern ? getRandomMotifPattern() : context.motifRepetitionPattern
    const generatedBars = new Map<string, NoteGenerationResult>()
    const melodyNotes: AppNote[] = []
    let lastPitch: string | undefined

    for (let i = 0; i < 4; i++) {
      const patternChar = pattern[i]
      let barResult: NoteGenerationResult | undefined = generatedBars.get(patternChar)

      if (barResult) {
        // If this bar has been generated before (repetition)
        if (useCallAndResponse) {
          // Apply a transformation for call and response
          let transformedNotes = barResult.notes
          const newLastPitch = barResult.lastPitch

          // Choose a random transformation type and interval
          const transformationType = Math.random()

          if (transformationType < 0.5) {
            // Diatonic Transposition
            const steps = Math.floor(Math.random() * 5) - 2 // -2, -1, 0, 1, 2 scale steps
            transformedNotes = transposeMelodyDiatonically(transformedNotes, scale.notes, steps)
          } else if (transformationType < 0.75) {
            // Chromatic Transposition (minor 2nd, major 2nd, etc.)
            const intervals = ['2m', '2M', '3m', '3M', '-2m', '-2M', '-3m', '-3M']
            const randomInterval = intervals[Math.floor(Math.random() * intervals.length)]
            transformedNotes = transposeMelody(transformedNotes, randomInterval)
          } else {
            // Inversion
            transformedNotes = invertMelody(transformedNotes)
          }

          // Ensure transformed notes are within the current scale
          transformedNotes = mapMelodyToScale(transformedNotes, scale.notes)

          // Update barResult with transformed notes and re-evaluate lastPitch
          barResult = { notes: transformedNotes, lastPitch: newLastPitch }
        }
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
