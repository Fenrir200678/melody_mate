import type { ChordEvent } from '../schemas/chord.schema'

export interface MelodyMetrics {
  rangeSemitones: number
  rangeLabel: string
  motionBalance: { steps: number; leaps: number; repeats: number }
  syncopationRatio: number
  /** Null when no sounding onset has chord coverage. */
  chordToneRatio: number | null
  repetitionScore: number
  tensionPerBar: number[]
  contourClarity: number
  rhythmPredictability: number
  /** Null when there is no chord at the analyzed region's closing boundary. */
  resolution: 0 | 0.5 | 1 | null
}

export interface MelodyAnalysisContext {
  key: string
  scale: string
  chords?: ChordEvent[]
  stepsPerBar: number
  /** Quarter-note grid, independent of the editing snap. Defaults to stepsPerBar / 4. */
  beatSteps?: number
  snapStep: number
  minOctave: number
  maxOctave: number
  bars?: number
  startStep?: number
}
