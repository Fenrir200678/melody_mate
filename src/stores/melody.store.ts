import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import {
  GENERATOR_STORAGE_KEY,
  loadGeneratorParamsFromStorage,
  saveGeneratorParamsToStorage
} from '../composables/generatorStorage'
import {
  addNoteToList,
  deleteNotes,
  duplicateNotes,
  sortNotes,
  updateNoteInList
} from '../composables/pianoroll/noteOps'
import {
  adjustNotesDuration,
  adjustNotesVelocity,
  findNextNoteId,
  findPreviousNoteId,
  nudgeNotesTime,
  toggleNotesMute,
  transposeNotesPitch
} from '../core/pianoroll/note-editing'
import { useMelodyGeneration } from '../composables/useMelodyGeneration'
import { useArpGeneration } from '../composables/useArpGeneration'
import { useArpAudition } from '../composables/useArpAudition'
import { useMelodyHistory } from '../composables/useMelodyHistory'
import { pickRandomRhythmPresetId } from '../core/rhythm/presets'
import { quantizeNotes } from '../core/rhythm/quantize'
import {
  GeneratorParamsSchema,
  resolveGeneratorParams,
  type GeneratorParams,
  type RhythmMode
} from '../core/schemas/generator.schema'
import type { AppNote } from '../core/schemas/note.schema'
import type { TakeSnapshot } from '../core/schemas/take.schema'
import { copyNotes, type TakeScope } from '../core/takes/scope'
import { createRng } from '../core/generator/rng'
import { STEPS_PER_BAR } from '../core/schemas/project.schema'
import {
  mutateNotes,
  transformNotes,
  transformUnavailableReason,
  type MutationAxes,
  type TransformOp,
  type VariationContext
} from '../core/variation'
import { mergeWorkRangeVariation, notesInWorkRange, replaceNotesInWorkRange } from '../core/generator/work-range'
import { DEFAULT_VARIATION_SETTINGS } from '../config/defaults'
import { useAudioStore } from './audio.store'
import { useProjectStore } from './project.store'
import { useUiStore } from './ui.store'
import { useTakesStore } from './takes.store'

export { GENERATOR_STORAGE_KEY }

export const useMelodyStore = defineStore('melody', () => {
  const notes = ref<AppNote[]>([])
  const selectedNoteIds = ref<string[]>([])
  const isGenerating = ref<boolean>(false)
  const generatorParams = ref<GeneratorParams>(GeneratorParamsSchema.parse({}))
  const variationMode = ref<'mutate' | 'transform'>(DEFAULT_VARIATION_SETTINGS.variationMode)
  const mutationAxes = ref<MutationAxes>({ ...DEFAULT_VARIATION_SETTINGS.mutationAxes })
  const mutationStrength = ref(DEFAULT_VARIATION_SETTINGS.mutationStrength)
  const keepOriginalAsTake = ref(DEFAULT_VARIATION_SETTINGS.keepOriginalAsTake)

  const history = useMelodyHistory(notes)

  function saveGeneratorToStorage(): void {
    saveGeneratorParamsToStorage(generatorParams.value)
  }

  function hydrateGeneratorFromStorage(): void {
    const loaded = loadGeneratorParamsFromStorage()
    if (loaded) {
      generatorParams.value = loaded
    }
  }

  hydrateGeneratorFromStorage()

  if (typeof window !== 'undefined' && window.localStorage) {
    watch(generatorParams, () => saveGeneratorToStorage())
  }

  const canUndo = computed(() => history.canUndo.value)
  const canRedo = computed(() => history.canRedo.value)

  const selectedNotes = computed<AppNote[]>(() => {
    const set = new Set(selectedNoteIds.value)
    return notes.value.filter((n) => set.has(n.id))
  })

  function pruneSelectedNoteIds(): void {
    const idSet = new Set(notes.value.map((n) => n.id))
    selectedNoteIds.value = selectedNoteIds.value.filter((id) => idSet.has(id))
  }

  function syncAudioIfActive(replace = false): void {
    const audioStore = useAudioStore()
    if (audioStore.isPlaying || audioStore.isPaused) {
      audioStore.syncLeadSchedule(replace)
    }
  }

  function applyVariation(vary: (source: AppNote[], context: VariationContext) => AppNote[]): boolean {
    const projectStore = useProjectStore()
    const selection = notesInWorkRange(notes.value, projectStore.workRange)
    if (!selection.source.length) return false
    const varied = vary(selection.source, variationContext(selection.scope))
    const replacement = mergeWorkRangeVariation(notes.value, selection.source, varied, selection.scope)
    if (keepOriginalAsTake.value) {
      const takesStore = useTakesStore()
      const captured = takesStore.captureTake(
        notes.value,
        generatorParams.value,
        {
          key: projectStore.key,
          scale: projectStore.scale,
          bpm: projectStore.bpm,
          bars: projectStore.bars,
          rangeStartStep: 0,
          rangeEndStep: projectStore.bars * STEPS_PER_BAR
        },
        takesStore.currentSeed,
        { deduplicateBySeed: false }
      )
      if (!captured) return false
    }
    setNotes(replacement)
    return true
  }

  function variationContext(scope: TakeScope): VariationContext {
    const projectStore = useProjectStore()
    return {
      key: projectStore.key,
      scale: projectStore.scale,
      minOctave: generatorParams.value.minOctave,
      maxOctave: generatorParams.value.maxOctave,
      snapStep: useUiStore().snapStep,
      regionStartStep: scope.startStep,
      regionEndStep: scope.endStep
    }
  }

  function mutateCurrent(axes: MutationAxes, strength: number): void {
    if (!notes.value.length || !Object.values(axes).some(Boolean) || strength === 0) return
    const takesStore = useTakesStore()
    let seed = takesStore.currentSeed
    const applied = applyVariation((source, context) => {
      seed = takesStore.resolveGenerationSeed()
      return mutateNotes(source, axes, strength, context, createRng(seed))
    })
    if (applied) takesStore.markSeedUsed(seed)
  }

  function transformCurrent(op: TransformOp): void {
    if (getTransformDisabledReason(op)) return
    applyVariation((source, context) => transformNotes(source, op, context))
  }

  function getTransformDisabledReason(op: TransformOp): string | undefined {
    const { source, scope } = notesInWorkRange(notes.value, useProjectStore().workRange)
    const reason = transformUnavailableReason(source, op, variationContext(scope))
    if (reason === 'empty') return 'Add or generate notes in the work range to transform'
    if (reason === 'register') return 'Result exceeds Pitch & Register bounds. Widen the bounds or select fewer notes.'
    return undefined
  }

  function addNote(note: AppNote): void {
    history.record()
    notes.value = addNoteToList(notes.value, note)
    syncAudioIfActive()
  }

  function updateNote(id: string, partial: Partial<AppNote>): void {
    if (!notes.value.some((n) => n.id === id)) return

    history.record()
    notes.value = updateNoteInList(notes.value, id, partial)
    syncAudioIfActive()
  }

  function deleteNote(id: string): void {
    if (!notes.value.some((n) => n.id === id)) return

    history.record()
    notes.value = deleteNotes(notes.value, [id])
    pruneSelectedNoteIds()
    syncAudioIfActive()
  }

  function deleteSelectedNotes(): void {
    if (selectedNoteIds.value.length === 0) return

    history.record()
    notes.value = deleteNotes(notes.value, selectedNoteIds.value)
    selectedNoteIds.value = []
    syncAudioIfActive()
  }

  function quantize(snapStep?: number): void {
    const uiStore = useUiStore()
    const effectiveSnap = snapStep ?? uiStore.snapStep
    history.record()
    notes.value = quantizeNotes(notes.value, effectiveSnap)
    pruneSelectedNoteIds()
    syncAudioIfActive()
  }

  function clearMelody(): void {
    history.record()
    notes.value = []
    selectedNoteIds.value = []
    syncAudioIfActive()
  }

  function setNotes(newNotes: AppNote[], recordHistory = true, replacePlayback = true): void {
    if (recordHistory) {
      history.record()
    }
    history.resetComparison()
    notes.value = sortNotes(newNotes)
    pruneSelectedNoteIds()
    syncAudioIfActive(replacePlayback)
  }

  function replaceNotesInScope(newNotes: AppNote[], scope: TakeScope): void {
    history.record()
    notes.value = replaceNotesInWorkRange(notes.value, copyNotes(newNotes), scope)
    pruneSelectedNoteIds()
    syncAudioIfActive(true)
  }

  function swapTake(take: TakeSnapshot): void {
    history.swap(take)
    pruneSelectedNoteIds()
    syncAudioIfActive()
  }

  function setGeneratorParams(params: Partial<GeneratorParams>): void {
    generatorParams.value = resolveGeneratorParams(generatorParams.value, params)
  }

  function resetGeneratorParams(): void {
    generatorParams.value = GeneratorParamsSchema.parse({})
  }

  function resetVariationSettings(): void {
    variationMode.value = DEFAULT_VARIATION_SETTINGS.variationMode
    mutationAxes.value = { ...DEFAULT_VARIATION_SETTINGS.mutationAxes }
    mutationStrength.value = DEFAULT_VARIATION_SETTINGS.mutationStrength
    keepOriginalAsTake.value = DEFAULT_VARIATION_SETTINGS.keepOriginalAsTake
  }

  function setRhythmMode(mode: RhythmMode): void {
    setGeneratorParams({ rhythmMode: mode })
    if (mode === 'custom') useUiStore().setRhythmStudioOpen(true)
    else if (useUiStore().isRhythmStudioOpen) useUiStore().setRhythmStudioOpen(false)
  }

  function setRhythmPreset(id: string): void {
    setGeneratorParams({ rhythmPresetId: id })
  }

  function toggleRandomRhythmPreset(): void {
    setGeneratorParams({
      randomRhythmPreset: !generatorParams.value.randomRhythmPreset
    })
  }

  function pickRandomRhythmPreset(candidatePresets?: readonly { id: string }[]): void {
    const picked = pickRandomRhythmPresetId(candidatePresets)
    if (picked) {
      setRhythmPreset(picked)
    }
  }

  function selectNote(id: string, toggle = false): void {
    if (toggle) {
      if (selectedNoteIds.value.includes(id)) {
        selectedNoteIds.value = selectedNoteIds.value.filter((i) => i !== id)
      } else {
        selectedNoteIds.value.push(id)
      }
    } else {
      selectedNoteIds.value = [id]
    }
  }

  function setSelectedNoteIds(ids: string[]): void {
    const validIds = new Set(notes.value.map((n) => n.id))
    selectedNoteIds.value = ids.filter((id) => validIds.has(id))
  }

  function selectAll(): void {
    selectedNoteIds.value = notes.value.map((n) => n.id)
  }

  function clearSelection(): void {
    selectedNoteIds.value = []
  }

  function duplicateSelected(): void {
    if (selectedNoteIds.value.length === 0) return

    const uiStore = useUiStore()
    const projectStore = useProjectStore()
    const maxProjectStep = projectStore.bars * 16

    const { newNotes, clonedIds } = duplicateNotes(notes.value, selectedNoteIds.value, uiStore.snapStep, maxProjectStep)

    if (clonedIds.length > 0) {
      setNotes(newNotes, true)
      setSelectedNoteIds(clonedIds)
    }
  }

  function transposeSelected(semitones: number): void {
    if (selectedNoteIds.value.length === 0 || semitones === 0) return

    const uiStore = useUiStore()
    const projectStore = useProjectStore()

    const updated = transposeNotesPitch(notes.value, selectedNoteIds.value, semitones, {
      isScaleLocked: uiStore.isScaleLocked,
      rootKey: projectStore.key,
      scale: projectStore.scale,
      minMidi: 0,
      maxMidi: 127
    })

    const changed = updated.some((n, i) => n.midi !== notes.value[i]?.midi)
    if (!changed) return

    setNotes(updated, true, false)

    const firstSelected = updated.find((n) => selectedNoteIds.value.includes(n.id))
    if (firstSelected && uiStore.isAuditionEnabled) {
      const audioStore = useAudioStore()
      void audioStore.auditionPitch(firstSelected.pitch)
    }
  }

  function selectNextNote(): void {
    if (notes.value.length === 0) return
    const currentId = selectedNoteIds.value[selectedNoteIds.value.length - 1] ?? null
    const nextId = findNextNoteId(notes.value, currentId)
    if (!nextId) return
    selectedNoteIds.value = [nextId]

    if (useUiStore().isAuditionEnabled) {
      const audioStore = useAudioStore()
      const target = notes.value.find((n) => n.id === nextId)
      if (target) {
        void audioStore.auditionPitch(target.pitch)
      }
    }
  }

  function selectPreviousNote(): void {
    if (notes.value.length === 0) return
    const currentId = selectedNoteIds.value[0] ?? null
    const prevId = findPreviousNoteId(notes.value, currentId)
    if (!prevId) return
    selectedNoteIds.value = [prevId]

    if (useUiStore().isAuditionEnabled) {
      const audioStore = useAudioStore()
      const target = notes.value.find((n) => n.id === prevId)
      if (target) {
        void audioStore.auditionPitch(target.pitch)
      }
    }
  }

  function nudgeSelected(deltaSteps: number): void {
    if (selectedNoteIds.value.length === 0 || deltaSteps === 0) return
    const projectStore = useProjectStore()
    const maxProjectStep = projectStore.bars * STEPS_PER_BAR
    const updated = nudgeNotesTime(notes.value, selectedNoteIds.value, deltaSteps, maxProjectStep)
    const changed = updated.some((n, i) => n.step !== notes.value[i]?.step)
    if (!changed) return

    setNotes(updated, true, false)
  }

  function adjustSelectedDuration(deltaSteps: number): void {
    if (selectedNoteIds.value.length === 0 || deltaSteps === 0) return
    const updated = adjustNotesDuration(notes.value, selectedNoteIds.value, deltaSteps)
    const changed = updated.some((n, i) => n.durationSteps !== notes.value[i]?.durationSteps)
    if (!changed) return

    setNotes(updated, true, false)
  }

  function adjustSelectedVelocity(delta: number): void {
    if (selectedNoteIds.value.length === 0 || delta === 0) return
    const updated = adjustNotesVelocity(notes.value, selectedNoteIds.value, delta)
    const changed = updated.some((n, i) => n.velocity !== notes.value[i]?.velocity)
    if (!changed) return

    setNotes(updated, true, false)
  }

  function toggleSelectedMute(): void {
    if (selectedNoteIds.value.length === 0) return
    const updated = toggleNotesMute(notes.value, selectedNoteIds.value)
    const changed = updated.some((n, i) => n.isMuted !== notes.value[i]?.isMuted)
    if (!changed) return

    setNotes(updated, true, false)
  }

  function undo(): void {
    if (history.undo()) {
      pruneSelectedNoteIds()
      syncAudioIfActive()
    }
  }

  function redo(): void {
    if (history.redo()) {
      pruneSelectedNoteIds()
      syncAudioIfActive()
    }
  }

  const { generate } = useMelodyGeneration(generatorParams, isGenerating, setRhythmPreset, replaceNotesInScope)
  const arp = useArpGeneration(generatorParams, isGenerating, setGeneratorParams, replaceNotesInScope, () =>
    arpAudition.stopArpAudition()
  )
  const arpAudition = useArpAudition(() => (arp.arpCandidateState.value === 'ready' ? arp.arpCandidate.value : null))

  return {
    notes,
    selectedNoteIds,
    selectedNotes,
    isGenerating,
    generatorParams,
    variationMode,
    mutationAxes,
    mutationStrength,
    keepOriginalAsTake,
    mutateCurrent,
    transformCurrent,
    getTransformDisabledReason,
    canUndo,
    canRedo,
    generate,
    ...arp,
    ...arpAudition,
    addNote,
    updateNote,
    deleteNote,
    deleteSelectedNotes,
    deleteSelected: deleteSelectedNotes,
    quantize,
    clearMelody,
    setNotes,
    replaceNotesInScope,
    swapTake,
    setGeneratorParams,
    resetGeneratorParams,
    resetVariationSettings,
    setRhythmMode,
    setRhythmPreset,
    toggleRandomRhythmPreset,
    pickRandomRhythmPreset,
    selectNote,
    setSelectedNoteIds,
    selectAll,
    clearSelection,
    duplicateSelected,
    transposeSelected,
    selectNextNote,
    selectPreviousNote,
    nudgeSelected,
    adjustSelectedDuration,
    adjustSelectedVelocity,
    toggleSelectedMute,
    undo,
    redo,
    saveGeneratorToStorage,
    hydrateGeneratorFromStorage
  }
})
