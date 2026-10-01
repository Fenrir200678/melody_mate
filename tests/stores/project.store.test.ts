import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { PROJECT_SCHEMA_VERSION } from '../../src/core/schemas/project.schema'
import { DEFAULT_PROJECT_SETTINGS, PROJECT_BAR_BOUNDS } from '../../src/config/defaults'
import { PROJECT_DEFAULTS_FINGERPRINT, PROJECT_STORAGE_KEY, useProjectStore } from '../../src/stores/project.store'

const storageMap = new Map<string, string>()

const mockLocalStorage = {
  getItem: (key: string): string | null => storageMap.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    storageMap.set(key, String(value))
  },
  removeItem: (key: string): void => {
    storageMap.delete(key)
  },
  clear: (): void => {
    storageMap.clear()
  },
  get length(): number {
    return storageMap.size
  },
  key: (index: number): string | null => Array.from(storageMap.keys())[index] ?? null
}

// Ensure window and localStorage exist in Node test environment
;(globalThis as unknown as { window: unknown }).window = {
  localStorage: mockLocalStorage
}
;(globalThis as unknown as { localStorage: unknown }).localStorage = mockLocalStorage

describe('useProjectStore', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    setActivePinia(createPinia())
  })

  it('initializes with expected default values', () => {
    const store = useProjectStore()

    expect(store.toConfig()).toEqual({
      version: PROJECT_SCHEMA_VERSION,
      ...DEFAULT_PROJECT_SETTINGS
    })
  })

  it('toggles and sets looping state', () => {
    const store = useProjectStore()

    store.setLooping(false)
    expect(store.isLooping).toBe(false)

    store.setLooping(true)
    expect(store.isLooping).toBe(true)
  })

  it('clamps BPM within 40 to 280 range', () => {
    const store = useProjectStore()

    store.setBpm(20)
    expect(store.bpm).toBe(40)

    store.setBpm(350)
    expect(store.bpm).toBe(280)

    store.setBpm(132.7)
    expect(store.bpm).toBe(133)
  })

  it('clamps bars within PROJECT_BAR_BOUNDS and shrinks the loop end if necessary', () => {
    const store = useProjectStore()

    store.setBars(8)
    expect(store.bars).toBe(8)

    store.setBars(0)
    expect(store.bars).toBe(PROJECT_BAR_BOUNDS.min)

    store.setBars(45)
    expect(store.bars).toBe(PROJECT_BAR_BOUNDS.max)

    // When shortening bars below the loop end, loopEndStep adjusts to the new project length
    store.setLoop(0, 8 * 16)
    store.setBars(4)
    expect(store.bars).toBe(4)
    expect(store.loopEndStep).toBe(4 * 16)
  })

  it('clamps swing and timing looseness within 0.0 to 1.0', () => {
    const store = useProjectStore()

    store.setSwing(-0.5)
    expect(store.swing).toBe(0)

    store.setSwing(1.8)
    expect(store.swing).toBe(1)

    store.setTimingLooseness(-0.2)
    expect(store.timingLooseness).toBe(0)

    store.setTimingLooseness(2.5)
    expect(store.timingLooseness).toBe(1)
  })

  it('correctly sets step-based loop boundaries within project limits', () => {
    const store = useProjectStore()
    store.setBars(8)

    store.setLoop(32, 96)
    expect(store.loopStartStep).toBe(32)
    expect(store.loopEndStep).toBe(96)

    // Sub-bar loop regions are preserved at 16th-note precision
    store.setLoop(4, 12)
    expect(store.loopStartStep).toBe(4)
    expect(store.loopEndStep).toBe(12)

    // Attempting invalid bounds clamps to the project length
    store.setLoop(-3, 12 * 16)
    expect(store.loopStartStep).toBe(0)
    expect(store.loopEndStep).toBe(8 * 16)

    // A zero-length region collapses to a single step
    store.setLoop(50, 50)
    expect(store.loopStartStep).toBe(49)
    expect(store.loopEndStep).toBe(50)
  })

  it('exports valid ProjectConfig via toConfig()', () => {
    const store = useProjectStore()
    store.setBpm(140)
    store.setKey('F#')
    store.setScale('dorian')

    const config = store.toConfig()
    expect(config.version).toBe(PROJECT_SCHEMA_VERSION)
    expect(config.audioSavedAt).toBe(0)
    expect(config.bpm).toBe(140)
    expect(config.key).toBe('F#')
    expect(config.scale).toBe('dorian')
    expect(config.isLooping).toBe(true)
  })

  it('resets to defaults when reset() is called', () => {
    const store = useProjectStore()
    store.setBpm(160)
    store.setKey('G')
    store.setLooping(false)

    store.reset()

    expect(store.bpm).toBe(DEFAULT_PROJECT_SETTINGS.bpm)
    expect(store.key).toBe(DEFAULT_PROJECT_SETTINGS.key)
    expect(store.isLooping).toBe(DEFAULT_PROJECT_SETTINGS.isLooping)
  })

  it('hydrates state from valid localStorage payload', () => {
    const savedConfig = {
      version: PROJECT_SCHEMA_VERSION,
      bpm: 128,
      key: 'D',
      scale: 'dorian',
      bars: 8,
      swing: 0.25,
      timingLooseness: 0.15,
      loopStartStep: 16,
      loopEndStep: 80,
      isLooping: false,
      audioSavedAt: 1_700_000_000_000,
      defaultsFingerprint: PROJECT_DEFAULTS_FINGERPRINT
    }
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(savedConfig))

    const store = useProjectStore()
    store.hydrateFromStorage()

    expect(store.bpm).toBe(128)
    expect(store.key).toBe('D')
    expect(store.scale).toBe('dorian')
    expect(store.bars).toBe(8)
    expect(store.swing).toBe(0.25)
    expect(store.timingLooseness).toBe(0.15)
    expect(store.loopStartStep).toBe(16)
    expect(store.loopEndStep).toBe(80)
    expect(store.isLooping).toBe(false)
    expect(store.audioSavedAt).toBe(1_700_000_000_000)
  })

  it('falls back to safe defaults when localStorage payload is corrupt or invalid', () => {
    // 1. Completely invalid JSON
    localStorage.setItem(PROJECT_STORAGE_KEY, 'invalid-json{{{')
    const store1 = useProjectStore()
    store1.hydrateFromStorage()
    expect(store1.bpm).toBe(DEFAULT_PROJECT_SETTINGS.bpm)

    // 2. Schema violation (BPM out of bounds)
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify({ version: PROJECT_SCHEMA_VERSION, bpm: 9999, key: 'C' }))
    const store2 = useProjectStore()
    store2.hydrateFromStorage()
    expect(store2.bpm).toBe(DEFAULT_PROJECT_SETTINGS.bpm)

    // 3. Deliberate development reset: a previous-version document is discarded instead of migrated
    localStorage.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify({ version: PROJECT_SCHEMA_VERSION - 1, bpm: 175, key: 'C', subdivision: '8n' })
    )
    const store3 = useProjectStore()
    store3.hydrateFromStorage()
    expect(store3.bpm).toBe(DEFAULT_PROJECT_SETTINGS.bpm)
    expect(store3.audioSavedAt).toBe(DEFAULT_PROJECT_SETTINGS.audioSavedAt)
  })

  it('discards a stored document stamped with older project defaults', () => {
    localStorage.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify({ version: PROJECT_SCHEMA_VERSION, bpm: 175, defaultsFingerprint: 'stale-fingerprint' })
    )
    const store = useProjectStore()
    store.hydrateFromStorage()
    expect(store.bpm).toBe(DEFAULT_PROJECT_SETTINGS.bpm)
  })
  it('keeps work range independent of loop and supports explicit transfers', () => {
    const store = useProjectStore()
    store.setWorkRange({ startStep: 16, endStep: 32 })
    store.setLoop(0, 48)
    expect(store.workRange).toEqual({ startStep: 16, endStep: 32 })
    store.loopWorkRange()
    expect([store.loopStartStep, store.loopEndStep, store.isLooping]).toEqual([16, 32, true])
    store.setLoop(4, 12)
    store.useLoopAsWorkRange()
    expect(store.workRange).toEqual({ startStep: 4, endStep: 12 })
    store.selectEntireProject()
    expect(store.workRange).toEqual({ startStep: 0, endStep: store.bars * 16 })
  })

  it('expands a whole-project target but preserves a partial target when bars change', () => {
    const store = useProjectStore()
    store.selectEntireProject()
    store.setBars(8)
    expect(store.workRange).toEqual({ startStep: 0, endStep: 128 })
    store.setWorkRange({ startStep: 80, endStep: 100 })
    store.setBars(12)
    expect(store.workRange).toEqual({ startStep: 80, endStep: 100 })
    store.setBars(4)
    expect(store.workRange).toEqual({ startStep: 63, endStep: 64 })
  })

  it('persists and restores the work range without deriving it from loop bounds', () => {
    const store = useProjectStore()
    store.setWorkRange({ startStep: 8, endStep: 24 })
    store.setLoop(0, 48)
    store.saveToStorage()
    setActivePinia(createPinia())
    expect(useProjectStore().workRange).toEqual({ startStep: 8, endStep: 24 })
  })
})
