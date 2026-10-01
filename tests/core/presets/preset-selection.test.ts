import { describe, expect, it } from 'vitest'
import {
  applyPreviewControls,
  defaultPreviewControls,
  FACTORY_SOUND_IDS,
  getFactorySound,
  getPresetsForTrack,
  previewSendLevels
} from '@/core/presets/preview-sounds'
import { getPresetDefinition } from '@/core/presets/synths'

describe('Preset Selection & Track Filtering', () => {
  describe('Lead track presets', () => {
    it('contains all 12 lead presets with no duplicate names or IDs', () => {
      const presets = getPresetsForTrack('lead')
      expect(presets).toHaveLength(12)

      const ids = presets.map((p) => p.id)
      expect(new Set(ids).size).toBe(12)

      const names = presets.map((p) => p.name)
      expect(new Set(names).size).toBe(12)

      const triangleKeys = presets.filter((p) => p.name === 'Soft Triangle Keys')
      expect(triangleKeys).toHaveLength(1)
      expect(triangleKeys[0].id).toBe('soft-triangle-keys')
    })
  })

  describe('Chord track presets', () => {
    it('contains all 12 chord presets with no duplicate names or IDs', () => {
      const presets = getPresetsForTrack('chord')
      expect(presets).toHaveLength(12)

      const ids = presets.map((p) => p.id)
      expect(new Set(ids).size).toBe(12)

      const names = presets.map((p) => p.name)
      expect(new Set(names).size).toBe(12)

      const triangleKeys = presets.filter((p) => p.name === 'Triangle Comp')
      expect(triangleKeys).toHaveLength(1)
      expect(triangleKeys[0].id).toBe('triangle-comp')
    })
  })

  describe('Factory sound resolution & preview controls', () => {
    it('exposes exactly the curated track banks and excludes retired sounds', () => {
      const presets = [...getPresetsForTrack('lead'), ...getPresetsForTrack('chord')]
      expect(FACTORY_SOUND_IDS).toHaveLength(24)
      expect(new Set(FACTORY_SOUND_IDS).size).toBe(24)
      expect(FACTORY_SOUND_IDS).toEqual(presets.map((preset) => preset.id))
      for (const track of ['lead', 'chord'] as const) {
        expect(getPresetsForTrack(track).every((preset) => preset.category === track)).toBe(true)
      }
      expect(getPresetDefinition('dirty-bass-lead')).toBeUndefined()
      expect(getPresetDefinition('hyper-pluck')).toBeUndefined()
      expect(getPresetDefinition('flute-vibe')).toBeUndefined()
      expect(getPresetDefinition('soft-strings')).toBeUndefined()
    })

    it("keeps each preset's effect balance when Space changes", () => {
      const lead = getFactorySound('crystal-pluck')
      const chord = getFactorySound('juno-chords')
      expect(previewSendLevels(lead, 'lead', 12)).toEqual({ reverb: 0.12, secondary: 0.15 })
      expect(previewSendLevels(chord, 'chord', 18)).toEqual({ reverb: 0.18, secondary: 0.22 })
      expect(previewSendLevels(lead, 'lead', 0)).toEqual({ reverb: 0, secondary: 0 })
      expect(previewSendLevels(getFactorySound('retro-chiptune'), 'lead', 50).secondary).toBe(0)
    })

    it('keeps factory articulation when default preview controls are applied', () => {
      for (const id of FACTORY_SOUND_IDS) {
        const patch = getFactorySound(id)
        const preview = applyPreviewControls(patch, defaultPreviewControls(id))
        if (patch.backend !== 'tone' || preview.backend !== 'tone') throw new Error('Expected a Tone factory sound')
        // The percentage control quantizes release to roughly 24 ms steps.
        expect(Math.abs(preview.options.envelope.release - patch.options.envelope.release)).toBeLessThanOrEqual(0.017)
        expect(preview.options.oscillator).toEqual(patch.options.oscillator)
        expect(preview.outputTrimDb).toBe(patch.outputTrimDb)
        expect(getFactorySound(id)).toEqual(patch)
      }
    })

    it('resolves all FACTORY_SOUND_IDS successfully via getFactorySound', () => {
      for (const id of FACTORY_SOUND_IDS) {
        const patch = getFactorySound(id)
        expect(patch).toBeDefined()
        expect(patch.id).toBe(id)
      }
    })

    it('calculates valid preview controls for every factory sound', () => {
      const keys = ['attack', 'decay', 'sustain', 'release', 'cutoff', 'delay', 'chorus', 'reverb'] as const
      for (const id of FACTORY_SOUND_IDS) {
        const controls = defaultPreviewControls(id)
        for (const key of keys) {
          expect(controls[key]).toBeGreaterThanOrEqual(0)
          expect(controls[key]).toBeLessThanOrEqual(100)
        }
      }
    })
  })
})
