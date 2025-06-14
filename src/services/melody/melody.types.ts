import type { AppScale, AppNote } from '@/ts/models'
import type { MarkovTable } from '@/utils/markov'
import type { AnyRhythm } from '@/ts/types/rhythm.types'

/**
 * Options for generating a melody.
 * These are the primary settings provided by the user/client.
 */
export type MelodyGenerationOptions = {
  scale: AppScale
  rhythm: AnyRhythm
  bars: number
  octave: number
  useMotifRepetition: boolean
  motifRepetitionPattern: string
  useRandomMotifPattern: boolean
  useNGrams: boolean
  useFixedVelocity: boolean
  fixedVelocity: number
  startWithRootNote?: boolean
  restProbability?: number
  n?: number
  useMotifTrainingData?: boolean
}

/**
 * Options specifically for the note generation step.
 * This is a subset of the main generation options.
 */
export type NoteGenerationOptions = {
  useFixedVelocity: boolean
  fixedVelocity: number
  startWithRootNote?: boolean
  restProbability?: number
  n?: number
}

/**
 * The internal context object for melody generation.
 * It holds all pre-calculated values and options needed during generation,
 * preventing the need to pass many individual parameters.
 */
export type MelodyGenerationContext = {
  options: MelodyGenerationOptions
  scale: AppScale
  rhythm: AnyRhythm
  markovTable: MarkovTable
  totalSteps: number
  stepsPerBar: number
  noteSteps: number[]
  octave: number
  subdivision: string
  n: number
  motifRepetitionPattern: string
  useRandomMotifPattern: boolean
}

/**
 * The result from the note generation process.
 * It includes the generated notes and the last pitch for melodic continuity.
 */
export type NoteGenerationResult = {
  notes: AppNote[]
  lastPitch: string
}
