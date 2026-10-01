import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as seedHelpers from '../../src/core/generator/rng'
import { GeneratorParamsSchema } from '../../src/core/schemas/generator.schema'
import { useHarmonyStore } from '../../src/stores/harmony.store'
import { useUiStore } from '../../src/stores/ui.store'
import type { AppNote } from '../../src/core/schemas/note.schema'
import { TAKES_STORAGE_KEY, TAKE_CAPACITY, useTakesStore } from '../../src/stores/takes.store'
import { installMockLocalStorage } from '../helpers/storage-mock'
import { DEFAULT_GENERATOR_PARAMS } from '../../src/config/defaults'

const context = { key: 'C', scale: 'major', bpm: 120, bars: 4 }
const note: AppNote = {
  id: '12345678-1234-4234-8234-123456789abc',
  pitch: 'C4',
  midi: 60,
  step: 0,
  durationSteps: 4,
  velocity: 100,
  isMuted: false
}

describe('useTakesStore', () => {
  let pinia: ReturnType<typeof createPinia>
  let storageMock: ReturnType<typeof installMockLocalStorage>

  beforeEach(() => {
    storageMock = installMockLocalStorage()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  afterEach(() => {
    disposePinia(pinia)
    vi.restoreAllMocks()
  })

  function capture(seed = 42) {
    return useTakesStore().captureTake([note], GeneratorParamsSchema.parse({}), context, seed)!
  }

  it('starts with empty takes and unlocked uint32 seed', () => {
    const store = useTakesStore()
    expect(store.takes).toEqual([])
    expect(store.seedLocked).toBe(false)
    expect(store.selectedTakeId).toBeNull()
    expect(store.compareEnabled).toBe(false)
    expect(store.isFull).toBe(false)
    expect(store.currentSeed).toBeGreaterThanOrEqual(0)
    expect(store.currentSeed).toBeLessThanOrEqual(0xffffffff)
  })

  it('captures detached notes, params and context in insertion order', () => {
    const store = useTakesStore()
    const notes = [{ ...note }]
    const params = GeneratorParamsSchema.parse({})
    const inputContext = { ...context }
    const first = store.captureTake(notes, params, inputContext, 1)!
    capture(2)
    notes[0].velocity = 50
    params.motif = 'FREE'
    inputContext.key = 'G'
    expect(store.takes.map((take) => take.seed)).toEqual([1, 2])
    expect(store.takes[0].notes[0].velocity).toBe(100)
    expect(store.takes[0].params.motif).toBe(DEFAULT_GENERATOR_PARAMS.motif)
    expect(store.takes[0].context.key).toBe('C')
    expect(first.score).toBe(0)
    expect(first.id).not.toBe(store.takes[1].id)
  })

  it('scores captured takes against the chord progression at capture time', () => {
    useHarmonyStore().setChords([
      {
        id: '12345678-1234-4234-8234-123456789abc',
        name: 'C major',
        roman: 'I',
        notes: ['C', 'E', 'G'],
        voicing: ['C3', 'E3', 'G3'],
        startBar: 0,
        durationBars: 4
      }
    ])

    const scored = capture(88)

    expect(scored.score).toBe(30)
    useHarmonyStore().useChords = false
    expect(capture(188).score).toBe(0)
    expect(scored.score).toBe(30)
  })

  it('leaves score null for a take with no sounding notes', () => {
    const muted = { ...note, isMuted: true }
    const take = useTakesStore().captureTake([muted], GeneratorParamsSchema.parse({}), context, 89)!

    expect(take.score).toBeNull()
  })

  it('scores scoped notes against the project origin when scope starts mid-bar', () => {
    const scopedNote = { ...note, step: 5 }
    const take = useTakesStore().captureTake(
      [scopedNote],
      GeneratorParamsSchema.parse({}),
      { ...context, rangeStartStep: 5, rangeEndStep: 27 },
      89
    )!

    expect(take.score).toBe(0)
  })

  it('keeps capture scores independent of the editor snap setting', () => {
    const notes = [
      { step: 0, midi: 60, pitch: 'C4' },
      { step: 1, midi: 62, pitch: 'D4' },
      { step: 2, midi: 64, pitch: 'E4' },
      { step: 4, midi: 66, pitch: 'F#4' }
    ].map(({ step, midi, pitch }, index) => ({
      ...note,
      id: `12345678-1234-4234-8234-${String(index + 1).padStart(12, '0')}`,
      midi,
      pitch,
      step
    }))
    const ui = useUiStore()
    ui.setSnapStep(1)
    const first = useTakesStore().captureTake(notes, GeneratorParamsSchema.parse({}), context, 90)!
    ui.setSnapStep(2)
    const second = useTakesStore().captureTake(notes, GeneratorParamsSchema.parse({}), context, 91)!

    expect(second.score).toBe(first.score)
  })

  it('reuses an existing seed without replacing its take data or metadata', () => {
    const store = useTakesStore()
    const original = capture(42)
    store.toggleLock(original.id)
    store.selectTake(original.id)
    const savedTake = { ...store.takes[0] }
    const differentNotes = [{ ...note, pitch: 'G4', midi: 67, velocity: 72 }]
    const differentParams = GeneratorParamsSchema.parse({ motif: 'FREE' })
    const differentContext = { ...context, key: 'G', scale: 'minor' }

    const reused = store.captureTake(differentNotes, differentParams, differentContext, 42)

    expect(reused).toMatchObject(savedTake)
    expect(store.takes).toHaveLength(1)
    expect(store.takes[0]).toMatchObject(savedTake)
    expect(store.takes[0].notes).toEqual([note])
    expect(store.takes[0].params.motif).toBe(DEFAULT_GENERATOR_PARAMS.motif)
    expect(store.takes[0].context).toEqual(context)
    expect(store.selectedTakeId).toBe(original.id)
  })

  it('evicts by timestamp while skipping locked takes', () => {
    const store = useTakesStore()
    const clock = vi.spyOn(Date, 'now')
    for (let seed = 0; seed < TAKE_CAPACITY; seed++) {
      clock.mockReturnValue(seed === 4 ? 0 : 100 + seed)
      capture(seed)
    }
    store.toggleLock(store.takes[0].id)
    store.toggleLock(store.takes[1].id)
    store.selectTake(store.takes[4].id)
    capture(TAKE_CAPACITY)
    expect(store.takes).toHaveLength(TAKE_CAPACITY)
    const expectedSeeds = Array.from({ length: TAKE_CAPACITY }, (_, i) => i)
      .filter((s) => s !== 4)
      .concat(TAKE_CAPACITY)
    expect(store.takes.map((take) => take.seed)).toEqual(expectedSeeds)
    expect(store.selectedTakeId).toBeNull()
    expect(store.isFull).toBe(false)
  })

  it('rejects capture when every slot is locked and resumes after unlocking', () => {
    const store = useTakesStore()
    for (let seed = 0; seed < TAKE_CAPACITY; seed++) {
      const take = capture(seed)
      store.toggleLock(take.id)
    }
    expect(store.isFull).toBe(true)
    expect(capture(TAKE_CAPACITY)).toBeNull()
    expect(store.takes).toHaveLength(TAKE_CAPACITY)
    store.toggleLock(store.takes[0].id)
    expect(store.isFull).toBe(false)
    expect(capture(TAKE_CAPACITY + 1).seed).toBe(TAKE_CAPACITY + 1)
  })

  it('reuses a matching seed in a full protected rack without evicting or changing it', () => {
    const store = useTakesStore()
    for (let seed = 0; seed < TAKE_CAPACITY; seed++) {
      const take = capture(seed)
      store.toggleLock(take.id)
    }
    const before = store.takes.map((take) => ({ ...take }))

    const reused = store.captureTake(
      [{ ...note, pitch: 'A4', midi: 69 }],
      GeneratorParamsSchema.parse({ motif: 'FREE' }),
      { ...context, key: 'D' },
      5
    )

    expect(reused?.id).toBe(before[5].id)
    expect(store.takes).toHaveLength(TAKE_CAPACITY)
    expect(store.takes).toEqual(before)
    expect(store.isFull).toBe(true)
  })

  it('toggles locks and removes selected takes', () => {
    const store = useTakesStore()
    const take = capture()
    store.toggleLock(take.id)
    expect(store.takes[0].locked).toBe(true)
    store.toggleLock(take.id)
    expect(store.takes[0].locked).toBe(false)
    store.selectTake('missing')
    expect(store.selectedTakeId).toBeNull()
    store.selectTake(take.id)
    expect(store.selectedTakeId).toBe(take.id)
    store.removeTake(take.id)
    expect(store.takes).toEqual([])
    expect(store.selectedTakeId).toBeNull()
  })

  it('clears every take, including locked takes, while preserving seed preferences', async () => {
    const store = useTakesStore()
    const take1 = capture(1)
    const take2 = capture(2)
    store.toggleLock(take1.id)
    store.toggleLock(take2.id)
    store.selectTake(take2.id)
    store.currentSeed = 987
    store.setSeedLocked(true)
    store.setCompareEnabled(true)

    store.clearAllTakes()
    await nextTick()

    expect(store.takes).toEqual([])
    expect(store.selectedTakeId).toBeNull()
    expect(store.isFull).toBe(false)
    expect(store.currentSeed).toBe(987)
    expect(store.seedLocked).toBe(true)
    expect(store.compareEnabled).toBe(true)
    expect(JSON.parse(storageMock.storage.getItem(TAKES_STORAGE_KEY)!)).toMatchObject({
      takes: [],
      currentSeed: 987,
      seedLocked: true,
      selectedTakeId: null,
      compareEnabled: true
    })
  })

  it('persists and restores takes, locks, selection and seed controls', async () => {
    const store = useTakesStore()
    const take = capture()
    store.toggleLock(take.id)
    store.selectTake(take.id)
    store.currentSeed = 765
    store.setSeedLocked(true)
    const savedSeed = store.currentSeed
    store.setCompareEnabled(true)
    await nextTick()
    disposePinia(pinia)
    pinia = createPinia()
    setActivePinia(pinia)
    const restored = useTakesStore()
    expect(restored.takes).toEqual(store.takes)
    expect(restored.selectedTakeId).toBe(take.id)
    expect(restored.currentSeed).toBe(savedSeed)
    expect(restored.seedLocked).toBe(true)
    expect(restored.compareEnabled).toBe(true)
  })

  it('uses a fresh random seed for each unlocked generation and records the used seed', () => {
    const store = useTakesStore()
    const randomSeed = vi.spyOn(seedHelpers, 'randomSeed').mockReturnValueOnce(123).mockReturnValueOnce(456)

    expect(store.resolveGenerationSeed()).toBe(123)
    store.markSeedUsed(123)
    expect(store.resolveGenerationSeed()).toBe(456)
    store.markSeedUsed(456)
    expect(store.currentSeed).toBe(456)
    expect(randomSeed).toHaveBeenCalledTimes(2)
  })

  it('reuses the current seed for every locked generation', () => {
    const store = useTakesStore()
    store.currentSeed = 789
    store.setSeedLocked(true)
    const randomSeed = vi.spyOn(seedHelpers, 'randomSeed')

    expect(store.resolveGenerationSeed()).toBe(789)
    expect(store.resolveGenerationSeed()).toBe(789)
    expect(randomSeed).not.toHaveBeenCalled()
  })

  it.each(['invalid-json', JSON.stringify({ takes: [{}] })])('discards corrupt storage %s', (raw) => {
    storageMock.storage.setItem(TAKES_STORAGE_KEY, raw)
    expect(useTakesStore().takes).toEqual([])
  })

  it('discards the entire array when one persisted take is invalid', async () => {
    capture()
    await nextTick()
    const state = JSON.parse(storageMock.storage.getItem(TAKES_STORAGE_KEY)!)
    state.takes.push({ ...state.takes[0], seed: -1 })
    storageMock.storage.setItem(TAKES_STORAGE_KEY, JSON.stringify(state))
    disposePinia(pinia)
    pinia = createPinia()
    setActivePinia(pinia)
    expect(useTakesStore().takes).toEqual([])
  })

  it('keeps in-memory state usable when storage writes fail', async () => {
    storageMock.failWritesFor(TAKES_STORAGE_KEY)
    const take = capture()
    await nextTick()
    expect(useTakesStore().takes[0].id).toBe(take.id)
    expect(storageMock.storage.getItem(TAKES_STORAGE_KEY)).toBeNull()
  })
})
