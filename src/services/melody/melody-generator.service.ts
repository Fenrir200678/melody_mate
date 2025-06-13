import type { Melody } from '@/ts/models'
import type { MelodyGenerationOptions } from '@/ts/types/melody.types'
import { buildMarkovTable } from '@/utils/markov'
import { createTrainingData } from './training-data.service'
import { normalizeRhythm, extractNoteSteps } from './rhythm-processor.service'
import { getStepsPerBar } from './duration.service'
import { generateNotesForSteps, type NoteGenerationOptions } from './note-generator.service'

/**
 * Main service for generating complete melodies using all melody generation components.
 */

/**
 * Generates a melody based on the given scale, rhythm, and parameters.
 * @param options - The melody generation options.
 * @returns The generated melody.
 */
export function generateMelody(options: MelodyGenerationOptions): Melody {
  const { scale, useNGrams } = options
  const rhythm = normalizeRhythm(options.rhythm)

  if (!scale.notes.length || !rhythm.pattern || !rhythm.pattern.length) {
    return { notes: [] }
  }

  const normalizedOptions = { ...options, rhythm }

  if (useNGrams) {
    return generateNGramMelody(normalizedOptions)
  } else {
    return generateSimpleMelody(normalizedOptions)
  }
}

/**
 * Generates a simple melody based on the given scale, rhythm, and parameters.
 * @param options - The melody generation options.
 * @returns The generated melody.
 */
function generateSimpleMelody(options: MelodyGenerationOptions): Melody {
  const {
    scale,
    rhythm,
    bars,
    useMotifRepetition,
    octave,
    useFixedVelocity,
    fixedVelocity,
    startWithRootNote = false,
    restProbability,
    useMotifTrainingData
  } = options

  const trainingData = createTrainingData(scale, useMotifTrainingData)
  const markovTable = buildMarkovTable(trainingData, 1)

  const rhythmPattern = rhythm.pattern!
  const subdivision = rhythm.subdivision!
  const STEPS_PER_BAR = getStepsPerBar(subdivision)
  const totalSteps = bars * STEPS_PER_BAR

  const noteSteps = extractNoteSteps(rhythmPattern, totalSteps)

  if (noteSteps.length === 0) return { notes: [] }

  const noteGenOptions: NoteGenerationOptions = {
    useFixedVelocity,
    fixedVelocity,
    startWithRootNote,
    restProbability
  }

  if (useMotifRepetition && bars >= 4) {
    // Generate the first two bars as the motif
    const motifEndStep = STEPS_PER_BAR * 2
    const motifSteps = noteSteps.filter((step) => step < motifEndStep)
    if (motifSteps.length === 0) {
      // No notes in the first two bars, so fall back to normal generation
      return {
        notes: generateNotesForSteps(noteSteps, totalSteps, scale, markovTable, octave, subdivision, noteGenOptions)
          .notes
      }
    }

    const motifNotesResult = generateNotesForSteps(
      motifSteps,
      motifEndStep,
      scale,
      markovTable,
      octave,
      subdivision,
      noteGenOptions
    )
    const motif = motifNotesResult.notes
    const lastMotifPitch = motifNotesResult.lastPitch

    // The third bar is a repetition of the first bar of the motif
    const firstBarStepsInMotif = motif.length > 0 ? motifSteps.filter((s) => s < STEPS_PER_BAR) : []
    const notesInFirstBarOfMotif = firstBarStepsInMotif.length

    const bar3Notes = motif.slice(0, notesInFirstBarOfMotif)

    // Notes for the final bar (bar 4)
    const bar4StartStep = STEPS_PER_BAR * 3
    const bar4Steps = noteSteps.filter((step) => step >= bar4StartStep)
    const finalBarNotes = generateNotesForSteps(
      bar4Steps,
      totalSteps,
      scale,
      markovTable,
      octave,
      subdivision,
      noteGenOptions,
      lastMotifPitch
    ).notes

    return { notes: [...motif, ...bar3Notes, ...finalBarNotes] }
  }

  return {
    notes: generateNotesForSteps(noteSteps, totalSteps, scale, markovTable, octave, subdivision, noteGenOptions).notes
  }
}

/**
 * Generates an N-gram melody based on the given scale, rhythm, and parameters.
 * @param options - The melody generation options.
 * @returns The generated melody.
 */
function generateNGramMelody(options: MelodyGenerationOptions): Melody {
  const {
    scale,
    rhythm,
    bars,
    octave,
    useFixedVelocity,
    fixedVelocity,
    startWithRootNote = false,
    restProbability,
    useMotifTrainingData,
    n = 2
  } = options

  const trainingData = createTrainingData(scale, useMotifTrainingData)
  const markovTable = buildMarkovTable(trainingData, n)

  const rhythmPattern = rhythm.pattern!
  const subdivision = rhythm.subdivision!
  const STEPS_PER_BAR = getStepsPerBar(subdivision)
  const totalSteps = bars * STEPS_PER_BAR

  const noteSteps = extractNoteSteps(rhythmPattern, totalSteps)

  if (noteSteps.length === 0) return { notes: [] }

  const noteGenOptions: NoteGenerationOptions = {
    useFixedVelocity,
    fixedVelocity,
    startWithRootNote,
    restProbability,
    n
  }

  return {
    notes: generateNotesForSteps(noteSteps, totalSteps, scale, markovTable, octave, subdivision, noteGenOptions).notes
  }
}
