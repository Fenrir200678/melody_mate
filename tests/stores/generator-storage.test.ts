import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GENERATOR_STORAGE_KEY,
  loadGeneratorParamsFromStorage,
  saveGeneratorParamsToStorage
} from '../../src/composables/generatorStorage'
import { GeneratorParamsSchema } from '../../src/core/schemas/generator.schema'
import { DEFAULT_GENERATOR_PARAMS } from '../../src/config/defaults'
import { defaultsFingerprint } from '../../src/utils/defaults-fingerprint.utils'

describe('generator params storage', () => {
  const saved = new Map<string, string>()

  beforeEach(() => {
    saved.clear()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => saved.get(key) ?? null,
        setItem: (key: string, value: string) => void saved.set(key, String(value))
      }
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('round-trips saved params', () => {
    const params = GeneratorParamsSchema.parse({ rhythmPresetId: 'two-bar-question-answer', restProbability: 0.3 })
    saveGeneratorParamsToStorage(params)
    expect(loadGeneratorParamsFromStorage()).toEqual(params)
  })

  it('resets an unavailable preset to the configured default while keeping other settings', () => {
    saveGeneratorParamsToStorage(GeneratorParamsSchema.parse({ rhythmPresetId: 'walking-bass', restProbability: 0.3 }))
    expect(loadGeneratorParamsFromStorage()).toMatchObject({
      rhythmPresetId: DEFAULT_GENERATOR_PARAMS.rhythmPresetId,
      restProbability: 0.3
    })
  })

  it('fills schema defaults for fields missing from a stamped payload', () => {
    saved.set(
      GENERATOR_STORAGE_KEY,
      JSON.stringify({ restProbability: 0.3, defaultsFingerprint: defaultsFingerprint(DEFAULT_GENERATOR_PARAMS) })
    )
    expect(loadGeneratorParamsFromStorage()).toMatchObject({
      restProbability: 0.3,
      rhythmPresetId: DEFAULT_GENERATOR_PARAMS.rhythmPresetId,
      motifVariation: DEFAULT_GENERATOR_PARAMS.motifVariation
    })
  })

  it('discards a payload stamped with older defaults so config defaults win', () => {
    saved.set(
      GENERATOR_STORAGE_KEY,
      JSON.stringify({ ...GeneratorParamsSchema.parse({}), defaultsFingerprint: 'stale-fingerprint' })
    )
    expect(loadGeneratorParamsFromStorage()).toBeNull()
  })

  it('discards a legacy payload without a defaults fingerprint', () => {
    saved.set(GENERATOR_STORAGE_KEY, JSON.stringify({ rhythmPresetId: 'two-bar-question-answer' }))
    expect(loadGeneratorParamsFromStorage()).toBeNull()
  })
})
