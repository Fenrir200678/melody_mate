export type RhythmCategory = 'bass' | 'melody' | 'world' | 'euclidean'

export type WeightedRhythm = {
  name: string
  category: 'bass' | 'melody' | 'world'
  description?: string
  steps: string[]
  subdivision: '4n' | '8n' | '16n'
  degreeWeights: Record<number, number>
}

export type EuclideanRhythm = {
  name: string
  category: 'euclidean'
  description?: string
  pulses: number
  pattern: (0 | 1)[]
  subdivision: string
}

export type AnyRhythm = WeightedRhythm | EuclideanRhythm

export function isEuclideanRhythm(rhythm: AnyRhythm | null): rhythm is EuclideanRhythm {
  return rhythm?.category === 'euclidean'
}

export type SequencerStep = number

export type CustomRhythm = Array<{ duration: number; isRest: boolean }>

// --- Unified Rhythm Model ---

/**
 * Represents a single rhythmic event in a measure.
 */
export type RhythmEvent = {
  /** The starting step of the event within the measure (e.g., 0-15 for 16th notes in a 4/4 bar). */
  step: number
  /** The duration of the event in steps. */
  durationInSteps: number
  /** Whether the event is a rest or a note. */
  isRest: boolean
}

/**
 * A unified, explicit representation of a rhythm pattern for one bar.
 * This structure is the target format for all rhythm sources (Presets, Euclidean, Custom)
 * to be processed by the melody generation pipeline.
 */
export type UnifiedRhythm = {
  /** The sequence of notes and rests. */
  events: RhythmEvent[]
  /** The total number of steps in one bar (e.g., 16 for '16n' subdivision). */
  totalSteps: number
  /** The subdivision that defines the grid resolution. */
  subdivision: '4n' | '8n' | '16n'
}
