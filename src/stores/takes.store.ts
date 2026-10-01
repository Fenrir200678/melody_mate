import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { z } from 'zod'
import { createId, randomSeed } from '../core/generator/rng'
import { computeMelodyMetrics, catchinessScore } from '../core/analysis'
import { STEPS_PER_BAR } from '../core/schemas/project.schema'
import type { GeneratorParams } from '../core/schemas/generator.schema'
import type { AppNote } from '../core/schemas/note.schema'
import { SeedSchema, TakeSnapshotSchema, type TakeContext, type TakeSnapshot } from '../core/schemas/take.schema'
import { DEFAULT_TAKE_CAPACITY } from '../config/defaults'
import { useHarmonyStore } from './harmony.store'

export const TAKES_STORAGE_KEY = 'melodymate-takes-v1'
export const TAKE_CAPACITY = DEFAULT_TAKE_CAPACITY

const TakesStateSchema = z.object({
  takes: z.array(TakeSnapshotSchema).max(TAKE_CAPACITY),
  currentSeed: SeedSchema,
  seedLocked: z.boolean(),
  selectedTakeId: z.string().nullable(),
  compareEnabled: z.boolean()
})

function loadState(): z.infer<typeof TakesStateSchema> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(TAKES_STORAGE_KEY)
    if (!raw) return null
    const parsed = TakesStateSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export const useTakesStore = defineStore('takes', () => {
  const loaded = loadState()
  const takes = ref<TakeSnapshot[]>(loaded?.takes ?? [])
  const currentSeed = ref(loaded?.currentSeed ?? randomSeed())
  const seedLocked = ref(loaded?.seedLocked ?? false)
  const selectedTakeId = ref<string | null>(
    loaded?.takes.some((take) => take.id === loaded.selectedTakeId) ? loaded.selectedTakeId : null
  )
  const compareEnabled = ref(loaded?.compareEnabled ?? false)
  const isFull = computed(() => takes.value.length >= TAKE_CAPACITY && takes.value.every((take) => take.locked))

  watch([takes, currentSeed, seedLocked, selectedTakeId, compareEnabled], () => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(
        TAKES_STORAGE_KEY,
        JSON.stringify({
          takes: takes.value,
          currentSeed: currentSeed.value,
          seedLocked: seedLocked.value,
          selectedTakeId: selectedTakeId.value,
          compareEnabled: compareEnabled.value
        })
      )
    } catch {
      // Storage can be unavailable or full; keep the in-memory takes usable.
    }
  })

  function captureTake(
    notes: AppNote[],
    params: GeneratorParams,
    context: TakeContext,
    seed: number,
    options: { deduplicateBySeed?: boolean; arpVariations?: TakeSnapshot['arpVariations'] } = {}
  ): TakeSnapshot | null {
    const existingTake =
      options.deduplicateBySeed === false ? undefined : takes.value.find((take) => take.seed === seed)
    if (existingTake) return existingTake

    if (isFull.value) return null
    const projectEndStep = context.bars * STEPS_PER_BAR
    const hasSoundingNotes = notes.some(
      (note) => !note.isMuted && Number.isFinite(note.step) && note.step >= 0 && note.step < projectEndStep
    )
    const score = hasSoundingNotes
      ? catchinessScore(
          computeMelodyMetrics(notes, {
            key: context.key,
            scale: context.scale,
            chords: useHarmonyStore().useChords ? useHarmonyStore().chords : undefined,
            stepsPerBar: STEPS_PER_BAR,
            snapStep: 1,
            minOctave: params.minOctave,
            maxOctave: params.maxOctave,
            bars: context.bars
          })
        )
      : null
    const take = TakeSnapshotSchema.parse({
      id: createId(),
      seed,
      createdAt: Date.now(),
      notes,
      arpVariations: options.arpVariations,
      params,
      context,
      score
    })
    let retained = takes.value
    if (retained.length >= TAKE_CAPACITY) {
      const oldest = retained
        .filter((candidate) => !candidate.locked)
        .reduce((first, candidate) => (candidate.createdAt < first.createdAt ? candidate : first))
      retained = retained.filter((candidate) => candidate.id !== oldest.id)
      if (selectedTakeId.value === oldest.id) selectedTakeId.value = null
    }
    takes.value = [...retained, take]
    return take
  }

  function toggleLock(id: string): void {
    takes.value = takes.value.map((take) => (take.id === id ? { ...take, locked: !take.locked } : take))
  }

  function removeTake(id: string): void {
    takes.value = takes.value.filter((take) => take.id !== id)
    if (selectedTakeId.value === id) selectedTakeId.value = null
  }

  function clearAllTakes(): void {
    takes.value = []
    selectedTakeId.value = null
  }

  function selectTake(id: string | null): void {
    selectedTakeId.value = takes.value.some((take) => take.id === id) ? id : null
  }

  function setSeedLocked(locked: boolean): void {
    seedLocked.value = locked
  }

  function resolveGenerationSeed(): number {
    return seedLocked.value ? currentSeed.value : randomSeed()
  }

  function markSeedUsed(seed: number): void {
    currentSeed.value = seed
  }

  function reuseSeed(seed: number): void {
    currentSeed.value = SeedSchema.parse(seed)
    seedLocked.value = true
  }

  function setCompareEnabled(enabled: boolean): void {
    compareEnabled.value = enabled
  }

  return {
    takes,
    currentSeed,
    seedLocked,
    selectedTakeId,
    compareEnabled,
    isFull,
    capacity: TAKE_CAPACITY,
    captureTake,
    toggleLock,
    removeTake,
    clearAllTakes,
    selectTake,
    setSeedLocked,
    resolveGenerationSeed,
    markSeedUsed,
    reuseSeed,
    setCompareEnabled
  }
})
