import { describe, expect, it } from 'vitest'
import {
  APP_METADATA,
  DEFAULT_AUDIO_SOUND_IDS,
  DEFAULT_GENERATOR_PARAMS,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_TAKE_CAPACITY,
  DEFAULT_VARIATION_SETTINGS
} from '../../src/config/defaults'
import { ALL_RHYTHM_PRESETS } from '../../src/core/presets/rhythm'
import { ALL_BUILTIN_PRESETS } from '../../src/core/presets/synths'
import { GeneratorParamsSchema } from '../../src/core/schemas/generator.schema'
import { ProjectSchema, PROJECT_SCHEMA_VERSION } from '../../src/core/schemas/project.schema'

describe('core defaults configuration', () => {
  describe('DEFAULT_GENERATOR_PARAMS', () => {
    it('is valid according to GeneratorParamsSchema', () => {
      const parsed = GeneratorParamsSchema.parse(DEFAULT_GENERATOR_PARAMS)
      expect(parsed).toEqual(DEFAULT_GENERATOR_PARAMS)
    })

    it('respects logical generator bounds and invariants', () => {
      expect(DEFAULT_GENERATOR_PARAMS.minOctave).toBeLessThanOrEqual(DEFAULT_GENERATOR_PARAMS.maxOctave)
      expect(DEFAULT_GENERATOR_PARAMS.chordAdherence).toBeGreaterThanOrEqual(0)
      expect(DEFAULT_GENERATOR_PARAMS.chordAdherence).toBeLessThanOrEqual(1)
      expect(DEFAULT_GENERATOR_PARAMS.restProbability).toBeGreaterThanOrEqual(0)
      expect(DEFAULT_GENERATOR_PARAMS.restProbability).toBeLessThanOrEqual(1)
      expect(DEFAULT_GENERATOR_PARAMS.motifVariation).toBeGreaterThanOrEqual(0)
      expect(DEFAULT_GENERATOR_PARAMS.motifVariation).toBeLessThanOrEqual(1)
      expect(DEFAULT_GENERATOR_PARAMS.contourStrength).toBeGreaterThanOrEqual(0)
      expect(DEFAULT_GENERATOR_PARAMS.contourStrength).toBeLessThanOrEqual(1)
      expect(DEFAULT_GENERATOR_PARAMS.velocityVariation).toBeGreaterThanOrEqual(0)
      expect(DEFAULT_GENERATOR_PARAMS.velocityVariation).toBeLessThanOrEqual(1)
      expect(DEFAULT_GENERATOR_PARAMS.accentStrength).toBeGreaterThanOrEqual(0)
      expect(DEFAULT_GENERATOR_PARAMS.accentStrength).toBeLessThanOrEqual(1)
      expect(DEFAULT_GENERATOR_PARAMS.noteLength).toBeGreaterThanOrEqual(0.25)
      expect(DEFAULT_GENERATOR_PARAMS.noteLength).toBeLessThanOrEqual(1)
      expect(DEFAULT_GENERATOR_PARAMS.arpGate).toBeGreaterThanOrEqual(20)
      expect(DEFAULT_GENERATOR_PARAMS.arpGate).toBeLessThanOrEqual(100)
      expect(DEFAULT_GENERATOR_PARAMS.arpAdherence).toBeGreaterThanOrEqual(0)
      expect(DEFAULT_GENERATOR_PARAMS.arpAdherence).toBeLessThanOrEqual(100)
      expect(DEFAULT_GENERATOR_PARAMS.arpAccent).toBeGreaterThanOrEqual(0)
      expect(DEFAULT_GENERATOR_PARAMS.arpAccent).toBeLessThanOrEqual(100)
      expect(DEFAULT_GENERATOR_PARAMS.arpDensity).toBeGreaterThanOrEqual(50)
      expect(DEFAULT_GENERATOR_PARAMS.arpDensity).toBeLessThanOrEqual(100)
    })

    it('references an existing rhythm preset in the catalog', () => {
      const presetExists = ALL_RHYTHM_PRESETS.some((p) => p.id === DEFAULT_GENERATOR_PARAMS.rhythmPresetId)
      expect(presetExists).toBe(true)
    })
  })

  describe('DEFAULT_VARIATION_SETTINGS', () => {
    it('has valid variation settings within normalized bounds', () => {
      expect(['mutate', 'transform']).toContain(DEFAULT_VARIATION_SETTINGS.variationMode)
      expect(DEFAULT_VARIATION_SETTINGS.mutationStrength).toBeGreaterThanOrEqual(0)
      expect(DEFAULT_VARIATION_SETTINGS.mutationStrength).toBeLessThanOrEqual(1)
      expect(typeof DEFAULT_VARIATION_SETTINGS.keepOriginalAsTake).toBe('boolean')
      expect(typeof DEFAULT_VARIATION_SETTINGS.mutationAxes.rhythm).toBe('boolean')
      expect(typeof DEFAULT_VARIATION_SETTINGS.mutationAxes.pitch).toBe('boolean')
      expect(typeof DEFAULT_VARIATION_SETTINGS.mutationAxes.ornament).toBe('boolean')
      expect(typeof DEFAULT_VARIATION_SETTINGS.mutationAxes.simplify).toBe('boolean')
    })
  })

  describe('DEFAULT_PROJECT_SETTINGS', () => {
    it('is valid according to ProjectSchema', () => {
      const fullDoc = {
        version: PROJECT_SCHEMA_VERSION,
        ...DEFAULT_PROJECT_SETTINGS
      }
      const parsed = ProjectSchema.parse(fullDoc)
      expect(parsed).toEqual(fullDoc)
    })

    it('respects reasonable musical project bounds', () => {
      expect(DEFAULT_PROJECT_SETTINGS.bpm).toBeGreaterThanOrEqual(40)
      expect(DEFAULT_PROJECT_SETTINGS.bpm).toBeLessThanOrEqual(280)
      expect(DEFAULT_PROJECT_SETTINGS.bars).toBeGreaterThanOrEqual(1)
      expect(DEFAULT_PROJECT_SETTINGS.bars).toBeLessThanOrEqual(32)
      expect(DEFAULT_PROJECT_SETTINGS.loopStartStep).toBeLessThan(DEFAULT_PROJECT_SETTINGS.loopEndStep)
      expect(DEFAULT_PROJECT_SETTINGS.swing).toBeGreaterThanOrEqual(0)
      expect(DEFAULT_PROJECT_SETTINGS.swing).toBeLessThanOrEqual(1)
      expect(DEFAULT_PROJECT_SETTINGS.timingLooseness).toBeGreaterThanOrEqual(0)
      expect(DEFAULT_PROJECT_SETTINGS.timingLooseness).toBeLessThanOrEqual(1)
    })
  })

  describe('DEFAULT_AUDIO_SOUND_IDS', () => {
    it('references existing sound presets in factory sound collection', () => {
      const soundKeys = ALL_BUILTIN_PRESETS.map((p) => p.id)
      expect(soundKeys).toContain(DEFAULT_AUDIO_SOUND_IDS.lead)
      expect(soundKeys).toContain(DEFAULT_AUDIO_SOUND_IDS.chord)
    })
  })

  describe('DEFAULT_TAKE_CAPACITY', () => {
    it('is a positive integer representing take slot capacity', () => {
      expect(Number.isInteger(DEFAULT_TAKE_CAPACITY)).toBe(true)
      expect(DEFAULT_TAKE_CAPACITY).toBeGreaterThan(0)
    })
  })

  describe('APP_METADATA', () => {
    it('defines non-empty application branding and version metadata', () => {
      expect(APP_METADATA.name).toBe('Melody Mate')
      expect(APP_METADATA.edition).toBe('DAW Edition')
      expect(APP_METADATA.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(APP_METADATA.author).toBe('Fenrir')
      expect(APP_METADATA.copyright).toContain('Fenrir')
      expect(APP_METADATA.license).toContain('Non-Commercial')
      expect(APP_METADATA.licenseDetails).toBeTruthy()
    })

    it('contains valid secure project URLs', () => {
      expect(APP_METADATA.githubUrl).toMatch(/^https:\/\/github\.com\//)
      expect(APP_METADATA.docsUrl).toMatch(/^https:\/\/github\.com\//)
      expect(APP_METADATA.issuesUrl).toMatch(/^https:\/\/github\.com\//)
      expect(APP_METADATA.legacyAppUrl).toMatch(/^https:\/\//)
    })
  })
})
