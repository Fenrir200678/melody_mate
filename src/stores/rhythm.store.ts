import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import {
  clearPattern,
  copyEuclidean,
  copyPreset,
  duplicateBar as duplicatePatternBar,
  erase as eraseEvent,
  insert as insertEvent,
  move as moveEvent,
  resize as resizeEvent,
  resizePattern,
  setVelocity as changeVelocity,
  type PatternEditResult
} from '../core/rhythm/custom-pattern'
import { getRhythmPresetById } from '../core/rhythm/presets'
import { suggestCustomRhythmName } from '../core/rhythm/suggest-custom-rhythm-name'
import {
  CustomRhythmPatternSchema,
  SavedCustomRhythmPresetsSchema,
  type CustomRhythmPattern,
  type SavedCustomRhythmPreset
} from '../core/schemas/custom-rhythm.schema'
import { useHistory } from '../composables/useHistory'
import { useAudioStore } from './audio.store'
import { useMelodyStore } from './melody.store'
import { useProjectStore } from './project.store'
import { useUiStore } from './ui.store'

export const RHYTHM_STORAGE_KEY = 'melodymate-custom-rhythm-v1'
export const RHYTHM_PRESETS_STORAGE_KEY = 'melodymate-saved-custom-rhythms-v1'
const RHYTHM_STORAGE_VERSION = 1

function loadSavedPresets(): SavedCustomRhythmPreset[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RHYTHM_PRESETS_STORAGE_KEY)
    if (!raw) return []
    const document = JSON.parse(raw) as { version?: unknown; presets?: unknown }
    if (document.version !== RHYTHM_STORAGE_VERSION) return []
    const parsed = SavedCustomRhythmPresetsSchema.safeParse(document.presets)
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

function copyPattern(pattern: CustomRhythmPattern): CustomRhythmPattern {
  return { bars: pattern.bars, events: pattern.events.map((event) => ({ ...event })) }
}

function loadPattern(): CustomRhythmPattern {
  const empty: CustomRhythmPattern = { bars: 1, events: [] }
  if (typeof window === 'undefined') return empty
  try {
    const raw = window.localStorage.getItem(RHYTHM_STORAGE_KEY)
    if (!raw) return empty
    const document = JSON.parse(raw) as { version?: unknown; pattern?: unknown }
    if (document.version !== RHYTHM_STORAGE_VERSION) return empty
    const parsed = CustomRhythmPatternSchema.safeParse(document.pattern)
    return parsed.success ? parsed.data : empty
  } catch {
    return empty
  }
}

export const useRhythmStore = defineStore('rhythm', () => {
  const pattern = ref<CustomRhythmPattern>(loadPattern())
  const savedPresets = ref<SavedCustomRhythmPreset[]>(loadSavedPresets())
  const activeSavedPresetId = ref<string | null>(null)
  const selectedStep = ref<number | null>(null)
  const error = ref<string | null>(null)
  const isPreviewing = ref(false)
  const previewStep = ref<number | null>(null)
  const history = useHistory<CustomRhythmPattern>({ maxDepth: 50 })
  const canUndo = history.canUndo
  const canRedo = history.canRedo
  const canGenerate = computed(() => pattern.value.events.length > 0)
  let previewRequest = 0

  watch(pattern, (next) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(
          RHYTHM_STORAGE_KEY,
          JSON.stringify({ version: RHYTHM_STORAGE_VERSION, pattern: next })
        )
      } catch {
        error.value = 'Could not save the custom rhythm. Changes may be lost after reload.'
      }
    }
    if (isPreviewing.value) void startPreview()
  })
  watch(savedPresets, (presets) => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(
        RHYTHM_PRESETS_STORAGE_KEY,
        JSON.stringify({ version: RHYTHM_STORAGE_VERSION, presets })
      )
    } catch {
      error.value = 'Could not save custom rhythm presets. Changes may be lost after reload.'
    }
  })
  watch(
    () => useProjectStore().bpm,
    () => {
      if (isPreviewing.value) void startPreview()
    }
  )
  watch(
    () => useUiStore().isRhythmStudioOpen,
    (open) => {
      if (!open) stopPreview()
    }
  )

  function commit(result: PatternEditResult): boolean {
    if (!result.ok) {
      error.value = result.error
      return false
    }
    if (JSON.stringify(result.pattern) === JSON.stringify(pattern.value)) return true
    history.pushState(pattern.value)
    pattern.value = result.pattern
    error.value = null
    if (selectedStep.value !== null && !pattern.value.events.some((event) => event.step === selectedStep.value)) {
      selectedStep.value = null
    }
    return true
  }

  function insert(step: number, lengthSteps: number, velocity = 92): boolean {
    const success = commit(insertEvent(pattern.value, { step, lengthSteps, velocity }))
    if (success) selectedStep.value = step
    return success
  }
  function move(fromStep: number, toStep: number): boolean {
    const success = commit(moveEvent(pattern.value, fromStep, toStep))
    if (success) selectedStep.value = toStep
    return success
  }
  function resize(step: number, lengthSteps: number): boolean {
    return commit(resizeEvent(pattern.value, step, lengthSteps))
  }
  function erase(step: number): boolean {
    return commit(eraseEvent(pattern.value, step))
  }
  function setVelocity(step: number, velocity: number): boolean {
    return commit(changeVelocity(pattern.value, step, velocity))
  }
  function resizeBars(bars: 1 | 2 | 3 | 4): boolean {
    return commit(resizePattern(pattern.value, bars))
  }
  function duplicateBar(sourceBar: number): boolean {
    return commit(duplicatePatternBar(pattern.value, sourceBar))
  }
  function copyCurrentPreset(): boolean {
    const preset = getRhythmPresetById(useMelodyStore().generatorParams.rhythmPresetId)
    if (!preset) {
      error.value = 'The selected rhythm preset is unavailable.'
      return false
    }
    const unit = preset.subdivision === '8n' ? 2 : 1
    const steps = preset.steps.reduce((sum, part) => sum + part.durationSteps * unit, 0)
    const bars = Math.max(1, Math.min(4, Math.ceil(steps / 16))) as 1 | 2 | 3 | 4
    return commit(copyPreset(preset, bars))
  }
  function copyCurrentEuclidean(): boolean {
    const params = useMelodyStore().generatorParams
    return commit(
      copyEuclidean(
        params.euclideanPulses,
        params.euclideanSteps,
        params.euclideanRotation,
        params.euclideanSubdivision
      )
    )
  }
  function clear(): boolean {
    return commit(clearPattern(pattern.value))
  }
  function savePreset(name: string): SavedCustomRhythmPreset | null {
    const normalizedName =
      name.trim() ||
      suggestCustomRhythmName(
        pattern.value,
        savedPresets.value.map((preset) => preset.name)
      )
    if (normalizedName.length > 60) {
      error.value = 'Rhythm preset names must be 60 characters or fewer.'
      return null
    }
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `rhythm-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const preset: SavedCustomRhythmPreset = { id, name: normalizedName, pattern: copyPattern(pattern.value) }
    savedPresets.value = [...savedPresets.value, preset]
    activeSavedPresetId.value = id
    error.value = null
    return preset
  }
  function loadSavedPreset(id: string): boolean {
    const preset = savedPresets.value.find((candidate) => candidate.id === id)
    if (!preset) {
      error.value = 'The saved rhythm preset is unavailable.'
      return false
    }
    if (!commit({ ok: true, pattern: copyPattern(preset.pattern) })) return false
    activeSavedPresetId.value = id
    error.value = null
    return true
  }
  function updateSavedPreset(id: string, name?: string): boolean {
    const index = savedPresets.value.findIndex((preset) => preset.id === id)
    if (index < 0) {
      error.value = 'The saved rhythm preset is unavailable.'
      return false
    }
    const normalizedName = name?.trim()
    if (normalizedName !== undefined && (!normalizedName || normalizedName.length > 60)) {
      error.value = normalizedName
        ? 'Rhythm preset names must be 60 characters or fewer.'
        : 'Enter a name for the rhythm preset.'
      return false
    }
    const next = [...savedPresets.value]
    next[index] = {
      ...next[index],
      ...(normalizedName === undefined ? {} : { name: normalizedName }),
      pattern: copyPattern(pattern.value)
    }
    savedPresets.value = next
    activeSavedPresetId.value = id
    error.value = null
    return true
  }
  function renameSavedPreset(id: string, name: string): boolean {
    const normalizedName = name.trim()
    if (!normalizedName || normalizedName.length > 60) {
      error.value = normalizedName
        ? 'Rhythm preset names must be 60 characters or fewer.'
        : 'Enter a name for the rhythm preset.'
      return false
    }
    const index = savedPresets.value.findIndex((preset) => preset.id === id)
    if (index < 0) {
      error.value = 'The saved rhythm preset is unavailable.'
      return false
    }
    const next = [...savedPresets.value]
    next[index] = { ...next[index], name: normalizedName }
    savedPresets.value = next
    error.value = null
    return true
  }
  function deleteSavedPreset(id: string): boolean {
    if (!savedPresets.value.some((preset) => preset.id === id)) {
      error.value = 'The saved rhythm preset is unavailable.'
      return false
    }
    savedPresets.value = savedPresets.value.filter((preset) => preset.id !== id)
    if (activeSavedPresetId.value === id) activeSavedPresetId.value = null
    error.value = null
    return true
  }
  function undo(): void {
    const previous = history.undo(pattern.value)
    if (previous) pattern.value = previous
    error.value = null
  }
  function redo(): void {
    const next = history.redo(pattern.value)
    if (next) pattern.value = next
    error.value = null
  }
  async function startPreview(): Promise<void> {
    const request = ++previewRequest
    if (!canGenerate.value) {
      error.value = 'Add an onset before previewing.'
      return
    }
    const audio = useAudioStore()
    error.value = null
    audio.stopRhythmPreview()
    isPreviewing.value = true
    previewStep.value = null
    let started = false
    try {
      started = await audio.previewRhythm(
        pattern.value,
        (step) => {
          if (request === previewRequest) previewStep.value = step
        },
        () => {
          if (request === previewRequest) {
            isPreviewing.value = false
            previewStep.value = null
          }
        },
        () => request === previewRequest
      )
    } catch (failure) {
      if (request === previewRequest)
        error.value = failure instanceof Error ? failure.message : 'Could not start the rhythm preview.'
    }
    if (request !== previewRequest) {
      return
    }
    isPreviewing.value = started
    if (!started) error.value ??= audio.initializationError ?? 'Could not start the rhythm preview.'
  }
  function stopPreview(): void {
    previewRequest++
    useAudioStore().stopRhythmPreview()
    isPreviewing.value = false
    previewStep.value = null
  }

  return {
    pattern,
    savedPresets,
    activeSavedPresetId,
    selectedStep,
    error,
    isPreviewing,
    previewStep,
    canGenerate,
    canUndo,
    canRedo,
    insert,
    move,
    resize,
    erase,
    setVelocity,
    resizeBars,
    duplicateBar,
    copyCurrentPreset,
    copyCurrentEuclidean,
    clear,
    savePreset,
    loadSavedPreset,
    updateSavedPreset,
    renameSavedPreset,
    deleteSavedPreset,
    undo,
    redo,
    startPreview,
    stopPreview
  }
})
