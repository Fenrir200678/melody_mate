import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'
import { RHYTHM_PRESETS_STORAGE_KEY, RHYTHM_STORAGE_KEY, useRhythmStore } from '../../src/stores/rhythm.store'
import { useMelodyStore } from '../../src/stores/melody.store'
import { useUiStore } from '../../src/stores/ui.store'

const saved = new Map<string, string>()
const storage = {
  getItem: (key: string) => saved.get(key) ?? null,
  setItem: (key: string, value: string) => {
    saved.set(key, value)
  },
  removeItem: (key: string) => {
    saved.delete(key)
  }
}
;(globalThis as { window?: unknown }).window = { localStorage: storage, innerWidth: 1400 }

describe('rhythm store', () => {
  beforeEach(() => {
    saved.clear()
    setActivePinia(createPinia())
  })

  it('records only successful edits and supports undo and redo', () => {
    const store = useRhythmStore()
    expect(store.canGenerate).toBe(false)
    expect(store.insert(0, 4)).toBe(true)
    expect(store.insert(2, 4)).toBe(false)
    expect(store.pattern.events).toHaveLength(1)
    expect(store.canUndo).toBe(true)
    store.undo()
    expect(store.pattern.events).toHaveLength(0)
    store.redo()
    expect(store.pattern.events).toHaveLength(1)
  })

  it('persists a validated working pattern and rejects invalid storage', async () => {
    const store = useRhythmStore()
    store.insert(3, 2, 112)
    await nextTick()
    expect(JSON.parse(saved.get(RHYTHM_STORAGE_KEY) ?? '').pattern.events).toEqual([
      { step: 3, lengthSteps: 2, velocity: 112 }
    ])

    setActivePinia(createPinia())
    expect(useRhythmStore().pattern.events).toEqual([{ step: 3, lengthSteps: 2, velocity: 112 }])

    saved.set(
      RHYTHM_STORAGE_KEY,
      JSON.stringify({ version: 1, pattern: { bars: 1, events: [{ step: 15, lengthSteps: 2, velocity: 92 }] } })
    )
    setActivePinia(createPinia())
    expect(useRhythmStore().pattern.events).toEqual([])
  })

  it('keeps the working pattern when settings are reset', () => {
    const rhythm = useRhythmStore()
    rhythm.insert(0, 4)
    const melody = useMelodyStore()
    melody.setRhythmMode('custom')
    melody.resetGeneratorParams()
    useUiStore().reset()
    expect(melody.generatorParams.rhythmMode).toBe('preset')
    expect(rhythm.pattern.events).toHaveLength(1)
  })

  it('copies the selected Euclidean pulse grid as one undoable pattern edit', async () => {
    const rhythm = useRhythmStore()
    const melody = useMelodyStore()
    rhythm.insert(1, 2)
    melody.setGeneratorParams({
      euclideanPulses: 5,
      euclideanSteps: 12,
      euclideanRotation: 2,
      euclideanSubdivision: '16n'
    })

    expect(rhythm.copyCurrentEuclidean()).toBe(true)
    expect(rhythm.pattern.bars).toBe(3)
    expect(rhythm.pattern.events.length).toBeGreaterThan(1)
    await nextTick()
    expect(JSON.parse(saved.get(RHYTHM_STORAGE_KEY) ?? '').pattern).toEqual(rhythm.pattern)

    rhythm.undo()
    expect(rhythm.pattern).toEqual({ bars: 1, events: [{ step: 1, lengthSteps: 2, velocity: 92 }] })
  })

  it('saves, loads, updates, renames, and deletes custom rhythm presets', async () => {
    const rhythm = useRhythmStore()
    rhythm.insert(2, 3, 104)
    const preset = rhythm.savePreset('  Syncopated  ')
    expect(preset?.name).toBe('Syncopated')
    expect(rhythm.activeSavedPresetId).toBe(preset?.id)

    rhythm.clear()
    expect(rhythm.loadSavedPreset(preset!.id)).toBe(true)
    expect(rhythm.pattern.events).toEqual([{ step: 2, lengthSteps: 3, velocity: 104 }])

    rhythm.insert(8, 2, 80)
    expect(rhythm.updateSavedPreset(preset!.id, 'Updated')).toBe(true)
    expect(rhythm.renameSavedPreset(preset!.id, 'Renamed')).toBe(true)
    await nextTick()
    expect(JSON.parse(saved.get(RHYTHM_PRESETS_STORAGE_KEY) ?? '').presets[0]).toEqual({
      id: preset!.id,
      name: 'Renamed',
      pattern: rhythm.pattern
    })

    expect(rhythm.deleteSavedPreset(preset!.id)).toBe(true)
    expect(rhythm.savedPresets).toEqual([])
    expect(rhythm.activeSavedPresetId).toBeNull()
    expect(rhythm.pattern.events).toHaveLength(2)
  })

  it('ignores invalid saved preset storage and generates a name for blank input', () => {
    saved.set(RHYTHM_PRESETS_STORAGE_KEY, JSON.stringify({ version: 1, presets: [{ id: 'x', name: '', pattern: {} }] }))
    const rhythm = useRhythmStore()
    expect(rhythm.savedPresets).toEqual([])
    rhythm.insert(0, 4)
    const preset = rhythm.savePreset('   ')
    expect(preset?.name).toBeTruthy()
    expect(preset?.name).toBe(rhythm.savedPresets[0]?.name)
    expect(rhythm.savePreset('')?.name).toBe(`${preset?.name} 2`)
    expect(rhythm.error).toBeNull()
  })

  it('restores saved rhythms after creating a new store instance', async () => {
    const rhythm = useRhythmStore()
    rhythm.insert(4, 2)
    const preset = rhythm.savePreset('Backbeat')
    await nextTick()

    setActivePinia(createPinia())
    const restored = useRhythmStore()
    expect(restored.savedPresets).toEqual([preset])
    expect(restored.loadSavedPreset(preset!.id)).toBe(true)
    expect(restored.pattern.events).toEqual([{ step: 4, lengthSteps: 2, velocity: 92 }])
  })
})
