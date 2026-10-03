import { describe, expect, it } from 'vitest'
import { DEFAULT_GENERATOR_PARAMS, SURPRISE_ME_RANGES } from '../../../src/config/defaults'
import { createSurpriseSettings } from '../../../src/core/generator/surprise'
import { RHYTHM_PRESETS } from '../../../src/core/rhythm/presets'
import { GeneratorParamsSchema } from '../../../src/core/schemas/generator.schema'
import { PREDEFINED_PROGRESSIONS } from '../../../src/core/theory/progressions'
import { ROOT_KEYS, SUPPORTED_SCALES } from '../../../src/core/theory/scale.engine'

describe('Surprise me settings', () => {
  it.each([
    ['min', 0],
    ['max', 1 - Number.EPSILON]
  ] as const)('includes the %s boundaries and selects valid presets and generator parameters', (boundary, draw) => {
    const settings = createSurpriseSettings(() => draw)

    expect(ROOT_KEYS).toContain(settings.key)
    expect(SUPPORTED_SCALES.some((scale) => scale.id === settings.scale)).toBe(true)
    expect(PREDEFINED_PROGRESSIONS.some((preset) => preset.id === settings.progressionId)).toBe(true)
    expect(RHYTHM_PRESETS.some((preset) => preset.id === settings.generator.rhythmPresetId)).toBe(true)
    expect(GeneratorParamsSchema.safeParse({ ...DEFAULT_GENERATOR_PARAMS, ...settings.generator }).success).toBe(true)
    expect(settings.generator.markovOrder).toBe(SURPRISE_ME_RANGES.markovOrder[boundary])
    for (const parameter of ['chordAdherence', 'restProbability', 'noteLength'] as const) {
      expect(settings.generator[parameter]).toBe(SURPRISE_ME_RANGES[parameter][boundary] / 100)
    }
  })
})
