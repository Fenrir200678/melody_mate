import type { Melody, AppNote } from '@/ts/models'
import { buildMarkovTable } from '@/utils/markov'
import type { MelodyGenerationContext, NoteGenerationResult } from './melody.types'
import { createTrainingData } from './training-data.service'
import { normalizeRhythm, extractNoteSteps } from './rhythm-processor.service'
import { getStepsPerBar } from './duration.service'
import { generateNotesForSteps } from './note-generator.service'
import { getRandomMotifPattern } from './motif.service'
import { useCompositionStore } from '@/stores/composition.store'
import { useGenerationStore } from '@/stores/generation.store'
import { useRhythmStore } from '@/stores/rhythm.store'

import { generateScale } from '../ScaleService'
import type { AnyRhythm } from '@/ts/types/rhythm.types'

/**
 * Prepares the generation context object from the current store state.
 * @returns The fully populated melody generation context, or null if essential data is missing.
 */
function prepareGenerationContext(): MelodyGenerationContext | null {
  const compositionStore = useCompositionStore()
  const generationStore = useGenerationStore()
  const rhythmStore = useRhythmStore()

  const { bars, octave } = compositionStore
  const { useNGrams, nGramLength, useMotifTrainingData, motifRepetitionPattern, useRandomMotifPattern } =
    generationStore
  const { rhythm } = rhythmStore

  if (!rhythm) return null

  const scale = generateScale()
  if (!scale) return null

  // Normalize the rhythm pattern while preserving the other rhythm properties.
  const normalizedPattern = normalizeRhythm(rhythm.pattern)
  const normalizedRhythm = { ...rhythm, pattern: normalizedPattern } as AnyRhythm

  const trainingData = createTrainingData(scale, useMotifTrainingData)
  const markovN = useNGrams ? nGramLength : 1
  const markovTable = buildMarkovTable(trainingData, markovN)

  const subdivision = normalizedRhythm.pattern.subdivision!
  const stepsPerBar = getStepsPerBar(subdivision)
  const totalSteps = bars * stepsPerBar
  const noteSteps = extractNoteSteps(normalizedRhythm.pattern.pattern!, totalSteps)

  return {
    scale,
    rhythm: normalizedRhythm,
    markovTable,
    totalSteps,
    stepsPerBar,
    noteSteps,
    octave,
    subdivision,
    n: markovN,
    motifRepetitionPattern,
    useRandomMotifPattern
  }
}

/**
 * Generates a standard melody without motif repetition.
 * @param context - The melody generation context.
 * @returns The generated melody.
 */
function generateStandardMelody(context: MelodyGenerationContext): Melody {
  if (context.noteSteps.length === 0) return { notes: [] }

  const result = generateNotesForSteps(context)
  return {
    notes: result.notes
  }
}

/**
 * Generates a melody based on a randomly selected 4-bar motif pattern.
 * The pattern (e.g., 'ABAB', 'AABC') determines the repetition structure.
 * @param context - The melody generation context.
 * @returns The generated melody.
 */
function generateMotifBasedMelody(context: MelodyGenerationContext): Melody {
  const { noteSteps, stepsPerBar } = context
  const pattern = context.useRandomMotifPattern ? getRandomMotifPattern() : context.motifRepetitionPattern
  const generatedBars = new Map<string, NoteGenerationResult>()
  const melodyNotes: AppNote[] = []
  let lastPitch: string | undefined

  for (let i = 0; i < 4; i++) {
    const patternChar = pattern[i]
    let barResult: NoteGenerationResult | undefined = generatedBars.get(patternChar)

    if (!barResult) {
      const barStartStep = i * stepsPerBar
      const barEndStep = barStartStep + stepsPerBar
      const barNoteSteps = noteSteps.filter((step) => step >= barStartStep && step < barEndStep)

      // Only generate notes if there are steps in the bar
      if (barNoteSteps.length > 0) {
        const barContext: MelodyGenerationContext = {
          ...context,
          noteSteps: barNoteSteps,
          totalSteps: barEndStep
        }
        barResult = generateNotesForSteps(barContext, lastPitch)
      } else {
        // Create an empty result for empty bars to cache them
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
 * Main service for generating complete melodies using all melody generation components.
 */

/**
 * Generates a melody based on the given scale, rhythm, and parameters.
 * @returns The generated melody.
 */
export function generateMelody(): Melody {
  const context = prepareGenerationContext()
  if (!context) return { notes: [] }

  const { scale, rhythm } = context
  const { bars } = useCompositionStore()
  const { useMotifRepetition } = useGenerationStore()

  if (!scale.notes.length || !rhythm.pattern.pattern || !rhythm.pattern.pattern.length) {
    return { notes: [] }
  }

  if (useMotifRepetition && bars >= 4) {
    return generateMotifBasedMelody(context)
  }

  return generateStandardMelody(context)
}
