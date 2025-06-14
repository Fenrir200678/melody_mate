import type { RhythmPattern } from '../models/Rhythm'

export type RhythmCategory = 'bass' | 'melody' | 'world' | 'euclidean'

export type WeightedRhythm = {
  name: string
  pattern: RhythmPattern
  category: 'bass' | 'melody' | 'world'
  description?: string
  degreeWeights: Record<number, number>
}

export type EuclideanRhythm = {
  name: string
  pattern: RhythmPattern
  category: 'euclidean'
  description?: string
  pulses: number
}

export type AnyRhythm = WeightedRhythm | EuclideanRhythm

export function isEuclideanRhythm(rhythm: AnyRhythm | null): rhythm is EuclideanRhythm {
  return rhythm?.category === 'euclidean'
}
