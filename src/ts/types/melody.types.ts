import type { RhythmPattern, Scale } from '@/ts/models'
export type MelodyGenerationOptions = {
  scale: Scale
  rhythm: RhythmPattern
  bars: number
  octave: number
  useMotifRepetition: boolean
  useNGrams: boolean
  useFixedVelocity: boolean
  fixedVelocity: number
  startWithRootNote?: boolean
  restProbability?: number
  n?: number
  useMotifTrainingData?: boolean
  seedWithMotif?: boolean
}
