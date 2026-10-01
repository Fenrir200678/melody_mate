import { describe, expect, it } from 'vitest'
import {
  getRhythmPresetById,
  getRhythmPresetCycleSteps,
  getRhythmPresets,
  getRhythmPresetsByCategory,
  pickRandomRhythmPresetId,
  RHYTHM_PRESETS
} from '@/core/rhythm/presets'

describe('Rhythm Presets Library', () => {
  it('covers all categories with distinct rhythms rather than count quotas', () => {
    for (const category of ['melody', 'bass', 'world'] as const) {
      expect(getRhythmPresetsByCategory(category).length).toBeGreaterThan(0)
    }
    const signatures = RHYTHM_PRESETS.map((preset) => {
      const unit = preset.subdivision === '8n' ? 2 : 1
      return JSON.stringify(preset.steps.map((step) => [step.isNote, step.durationSteps * unit]))
    })
    expect(new Set(signatures).size).toBe(RHYTHM_PRESETS.length)
  })

  it('should have unique kebab-case IDs for every preset', () => {
    const ids = new Set<string>()
    for (const preset of RHYTHM_PRESETS) {
      expect(ids.has(preset.id)).toBe(false)
      ids.add(preset.id)
      expect(preset.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(preset.name.trim().length).toBeGreaterThan(0)
    }
  })

  it('should validate that all presets have positive duration steps summing to full measures', () => {
    for (const preset of RHYTHM_PRESETS) {
      expect(preset.steps.length).toBeGreaterThan(0)
      const bars = getRhythmPresetCycleSteps(preset) / 16
      expect(Number.isInteger(bars)).toBe(true)
      expect(bars).toBeGreaterThanOrEqual(1)
      expect(bars).toBeLessThanOrEqual(4)

      let hasActiveNote = false
      for (const step of preset.steps) {
        expect(step.durationSteps).toBeGreaterThan(0)
        expect(Number.isInteger(step.durationSteps)).toBe(true)
        expect(typeof step.isNote).toBe('boolean')
        if (step.isNote) hasActiveNote = true
      }
      expect(hasActiveNote).toBe(true)
    }
  })

  it('should lookup presets by ID correctly', () => {
    const tresillo = getRhythmPresetById('tresillo')
    expect(tresillo).toBeDefined()
    expect(tresillo?.name).toBe('Tresillo')
    expect(tresillo?.category).toBe('world')

    const unknown = getRhythmPresetById('non-existent-id')
    expect(unknown).toBeUndefined()
  })

  it('should return all presets via getRhythmPresets', () => {
    expect(getRhythmPresets()).toEqual(RHYTHM_PRESETS)
  })

  describe('pickRandomRhythmPresetId', () => {
    it('returns a valid preset id from the default pool', () => {
      const id = pickRandomRhythmPresetId()
      expect(typeof id).toBe('string')
      expect(RHYTHM_PRESETS.some((p) => p.id === id)).toBe(true)
    })

    it('picks from provided candidate list', () => {
      const candidates = [{ id: 'alpha' }, { id: 'beta' }]
      const id = pickRandomRhythmPresetId(candidates)
      expect(['alpha', 'beta']).toContain(id)
    })

    it('returns undefined if candidates array is empty and pool is empty', () => {
      expect(pickRandomRhythmPresetId([])).toBeDefined()
    })
  })
})
