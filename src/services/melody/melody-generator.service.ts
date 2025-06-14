import type { Melody } from '@/ts/models'
import { buildMarkovTable } from '@/utils/markov'
import type { MelodyGenerationOptions, MelodyGenerationContext } from './melody.types'
import { createTrainingData } from './training-data.service'
import { normalizeRhythm, extractNoteSteps } from './rhythm-processor.service'
import { getStepsPerBar } from './duration.service'
import { generateNotesForSteps } from './note-generator.service'

/**
 * Prepares the generation context object from the user-provided options.
 * @param options - The melody generation options.
 * @returns The fully populated melody generation context.
 */
function prepareGenerationContext(options: MelodyGenerationOptions): MelodyGenerationContext {
  const { scale, useNGrams, useMotifTrainingData, n = 1, bars, octave } = options

  // Normalize the rhythm pattern while preserving the other rhythm properties.
  const normalizedPattern = normalizeRhythm(options.rhythm.pattern)
  const rhythm = { ...options.rhythm, pattern: normalizedPattern }

  const trainingData = createTrainingData(scale, useMotifTrainingData)
  const markovN = useNGrams ? n : 1
  const markovTable = buildMarkovTable(trainingData, markovN)

  const subdivision = rhythm.pattern.subdivision!
  const stepsPerBar = getStepsPerBar(subdivision)
  const totalSteps = bars * stepsPerBar
  const noteSteps = extractNoteSteps(rhythm.pattern.pattern!, totalSteps)

  return {
    options,
    scale,
    rhythm,
    markovTable,
    totalSteps,
    stepsPerBar,
    noteSteps,
    octave,
    subdivision,
    n: markovN
  }
}

/**
 * Generates a standard melody without motif repetition.
 * @param context - The melody generation context.
 * @returns The generated melody.
 */
function generateStandardMelody(context: MelodyGenerationContext): Melody {
  if (context.noteSteps.length === 0) return { notes: [] }

  return {
    notes: generateNotesForSteps(context).notes
  }
}

/**
 * Generates a melody with a repeated two-bar motif.
 * @param context - The melody generation context.
 * @returns The generated melody.
 */
function generateMotifBasedMelody(context: MelodyGenerationContext): Melody {
  const { noteSteps, stepsPerBar } = context

  // Generate the first two bars as the motif
  const motifEndStep = stepsPerBar * 2
  const motifSteps = noteSteps.filter((step) => step < motifEndStep)

  if (motifSteps.length === 0) {
    // No notes in the first two bars, fallback to normal generation
    return generateStandardMelody(context)
  }

  // We need to create a new context for the motif part
  const motifContext: MelodyGenerationContext = {
    ...context,
    noteSteps: motifSteps,
    totalSteps: motifEndStep
  }
  const motifResult = generateNotesForSteps(motifContext)
  const motif = motifResult.notes

  // The third bar is a repetition of the first bar of the motif
  const noteCountInFirstBar = motifSteps.filter((step) => step < stepsPerBar).length
  const bar3Notes = motif.slice(0, noteCountInFirstBar)

  // Notes for the final bar (bar 4)
  const bar4StartStep = stepsPerBar * 3
  const bar4Steps = noteSteps.filter((step) => step >= bar4StartStep)

  // Context for the final bar
  const finalBarContext: MelodyGenerationContext = {
    ...context,
    noteSteps: bar4Steps,
    totalSteps: context.totalSteps // total steps of the whole melody
  }
  const finalBarNotes = generateNotesForSteps(finalBarContext, motifResult.lastPitch).notes

  return { notes: [...motif, ...bar3Notes, ...finalBarNotes] }
}

/**
 * Main service for generating complete melodies using all melody generation components.
 */

/**
 * Generates a melody based on the given scale, rhythm, and parameters.
 * @param options - The melody generation options.
 * @returns The generated melody.
 */
export function generateMelody(options: MelodyGenerationOptions): Melody {
  const context = prepareGenerationContext(options)
  const { scale, rhythm } = context
  const { bars, useMotifRepetition } = context.options

  if (!scale.notes.length || !rhythm.pattern.pattern || !rhythm.pattern.pattern.length) {
    return { notes: [] }
  }

  if (useMotifRepetition && bars >= 4) {
    return generateMotifBasedMelody(context)
  }

  return generateStandardMelody(context)
}
