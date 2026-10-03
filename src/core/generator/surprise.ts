import { SURPRISE_ME_RANGES } from '../../config/defaults'
import { pickRandomRhythmPresetId } from '../rhythm/presets'
import { ContourEnum, MotifPatternEnum, type GeneratorParams } from '../schemas/generator.schema'
import { pickRandomProgressionId } from '../theory/progressions'
import { ROOT_KEYS, SUPPORTED_SCALES, type RootKey } from '../theory/scale.engine'

export interface SurpriseSettings {
  key: RootKey
  scale: string
  progressionId: string
  generator: Pick<
    GeneratorParams,
    | 'rhythmMode'
    | 'rhythmPresetId'
    | 'randomRhythmPreset'
    | 'motif'
    | 'callAndResponse'
    | 'contour'
    | 'markovOrder'
    | 'chordAdherence'
    | 'restProbability'
    | 'noteLength'
  >
}

function pickValue<T>(values: readonly T[], rng: () => number): T {
  return values[Math.floor(rng() * values.length)]!
}

function pickRange(range: { min: number; max: number; step: number }, rng: () => number): number {
  const choices = Math.round((range.max - range.min) / range.step) + 1
  return range.min + Math.floor(rng() * choices) * range.step
}

export function createSurpriseSettings(rng: () => number = Math.random): SurpriseSettings {
  const key = pickValue(ROOT_KEYS, rng)
  const scale = pickValue(SUPPORTED_SCALES, rng).id
  const progressionId = pickRandomProgressionId(undefined, rng)
  const rhythmPresetId = pickRandomRhythmPresetId(undefined, rng)
  if (!progressionId || !rhythmPresetId) throw new Error('Surprise me requires chord and rhythm presets')

  return {
    key,
    scale,
    progressionId,
    generator: {
      rhythmMode: 'preset',
      rhythmPresetId,
      randomRhythmPreset: false,
      motif: pickValue(MotifPatternEnum.options, rng),
      callAndResponse: false,
      contour: pickValue(ContourEnum.options, rng),
      markovOrder: pickRange(SURPRISE_ME_RANGES.markovOrder, rng),
      chordAdherence: pickRange(SURPRISE_ME_RANGES.chordAdherence, rng) / 100,
      restProbability: pickRange(SURPRISE_ME_RANGES.restProbability, rng) / 100,
      noteLength: pickRange(SURPRISE_ME_RANGES.noteLength, rng) / 100
    }
  }
}
