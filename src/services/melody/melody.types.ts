import type { AppScale, AppNote } from '@/ts/models'
import type { MarkovTable } from '@/utils/markov'
import type { UnifiedRhythm } from '@/ts/types/rhythm.types'

/**
 * The internal context object for melody generation.
 * It holds all pre-calculated values and options needed during generation,
 * preventing the need to pass many individual parameters.
 */
export type MelodyGenerationContext = {
  scale: AppScale
  markovTable: MarkovTable
  totalSteps: number
  stepsPerBar: number
  unifiedRhythm: UnifiedRhythm
  minOctave: number
  maxOctave: number
  subdivision: string
  n: number
  motifRepetitionPattern: string
  useRandomMotifPattern: boolean
  melodicContour: string
}

/**
 * The result from the note generation process.
 * It includes the generated notes and the last pitch for melodic continuity.
 */
export type NoteGenerationResult = {
  notes: AppNote[]
  lastPitch: string
}
