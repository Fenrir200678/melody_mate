import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { normalizeWorkRange, type WorkRange } from '../core/generator/work-range'
import {
  PROJECT_SCHEMA_VERSION,
  ProjectSchema,
  STEPS_PER_BAR,
  type ProjectConfig
} from '../core/schemas/project.schema'
import { DEFAULT_PROJECT_SETTINGS, PROJECT_BAR_BOUNDS } from '../config/defaults'
import { defaultsFingerprint } from '../utils/defaults-fingerprint.utils'

export const PROJECT_STORAGE_KEY = 'melodymate_project'

export const PROJECT_DEFAULTS_FINGERPRINT = defaultsFingerprint({
  ...DEFAULT_PROJECT_SETTINGS,
  barBounds: PROJECT_BAR_BOUNDS
})

export type ProjectStorageResult = { ok: true } | { ok: false; error: string }

export const useProjectStore = defineStore('project', () => {
  // Safe defaults derived from ProjectSchema
  const defaults = ProjectSchema.parse({ version: PROJECT_SCHEMA_VERSION })

  const bpm = ref<number>(defaults.bpm)
  const key = ref<string>(defaults.key)
  const scale = ref<string>(defaults.scale)
  const bars = ref<number>(defaults.bars)
  const swing = ref<number>(defaults.swing)
  const timingLooseness = ref<number>(defaults.timingLooseness)
  const loopStartStep = ref<number>(defaults.loopStartStep)
  const loopEndStep = ref<number>(defaults.loopEndStep)
  const workRange = ref<WorkRange>({ ...defaults.workRange })
  const isLooping = ref<boolean>(defaults.isLooping)
  const audioSavedAt = ref<number>(defaults.audioSavedAt)

  function toConfig(): ProjectConfig {
    return {
      version: PROJECT_SCHEMA_VERSION,
      bpm: bpm.value,
      key: key.value,
      scale: scale.value,
      bars: bars.value,
      swing: swing.value,
      timingLooseness: timingLooseness.value,
      loopStartStep: loopStartStep.value,
      loopEndStep: loopEndStep.value,
      workRange: { ...workRange.value },
      isLooping: isLooping.value,
      audioSavedAt: audioSavedAt.value
    }
  }

  function setBpm(val: number): void {
    bpm.value = Math.max(40, Math.min(280, Math.round(val)))
  }

  function setKey(val: string): void {
    key.value = val
  }

  function setScale(val: string): void {
    scale.value = val
  }

  function setBars(val: number): void {
    const clampedBars = Math.max(PROJECT_BAR_BOUNDS.min, Math.min(PROJECT_BAR_BOUNDS.max, Math.round(val)))
    const coveredProject = workRange.value.startStep === 0 && workRange.value.endStep === bars.value * STEPS_PER_BAR
    bars.value = clampedBars
    workRange.value = normalizeWorkRange(
      coveredProject ? { startStep: 0, endStep: clampedBars * STEPS_PER_BAR } : workRange.value,
      clampedBars * STEPS_PER_BAR
    )
    // Keep loop bounds within project length
    const maxStep = clampedBars * STEPS_PER_BAR
    if (loopEndStep.value > maxStep) {
      loopEndStep.value = maxStep
    }
    if (loopStartStep.value > loopEndStep.value - 1) {
      loopStartStep.value = Math.max(0, loopEndStep.value - 1)
    }
  }

  function setSwing(val: number): void {
    swing.value = Math.max(0, Math.min(1, val))
  }

  function setTimingLooseness(val: number): void {
    timingLooseness.value = Math.max(0, Math.min(1, val))
  }

  function setLoop(startStep: number, endStep: number): void {
    const maxStep = bars.value * STEPS_PER_BAR
    const clampedEnd = Math.max(1, Math.min(maxStep, Math.round(endStep)))
    const clampedStart = Math.max(0, Math.min(clampedEnd - 1, Math.round(startStep)))
    loopStartStep.value = clampedStart
    loopEndStep.value = clampedEnd
  }

  function setWorkRange(range: WorkRange): void {
    workRange.value = normalizeWorkRange(range, bars.value * STEPS_PER_BAR)
  }

  function selectEntireProject(): void {
    setWorkRange({ startStep: 0, endStep: bars.value * STEPS_PER_BAR })
  }

  function useLoopAsWorkRange(): void {
    setWorkRange({ startStep: loopStartStep.value, endStep: loopEndStep.value })
  }

  function loopWorkRange(): void {
    setLoop(workRange.value.startStep, workRange.value.endStep)
    setLooping(true)
  }

  function setLooping(val: boolean): void {
    isLooping.value = val
  }

  function setAudioSavedAt(revision: number): void {
    audioSavedAt.value = Math.max(0, Math.round(revision))
  }

  function reset(): void {
    bpm.value = defaults.bpm
    key.value = defaults.key
    scale.value = defaults.scale
    bars.value = defaults.bars
    swing.value = defaults.swing
    timingLooseness.value = defaults.timingLooseness
    loopStartStep.value = defaults.loopStartStep
    loopEndStep.value = defaults.loopEndStep
    workRange.value = { ...defaults.workRange }
    isLooping.value = defaults.isLooping
    audioSavedAt.value = defaults.audioSavedAt
  }

  function saveToStorage(): ProjectStorageResult {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ok: false, error: 'Local storage is unavailable; the project was not saved.' }
    }
    try {
      window.localStorage.setItem(
        PROJECT_STORAGE_KEY,
        JSON.stringify({ ...toConfig(), defaultsFingerprint: PROJECT_DEFAULTS_FINGERPRINT })
      )
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error && error.message ? error.message : 'Project storage write failed.'
      }
    }
  }

  function hydrateFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY)
      if (!raw) return
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null) return
      // Documents stamped with older defaults are discarded so config changes win on app start.
      if ((parsed as Record<string, unknown>).defaultsFingerprint !== PROJECT_DEFAULTS_FINGERPRINT) return
      const result = ProjectSchema.safeParse(parsed)
      if (result.success) {
        bpm.value = result.data.bpm
        key.value = result.data.key
        scale.value = result.data.scale
        bars.value = result.data.bars
        swing.value = result.data.swing
        timingLooseness.value = result.data.timingLooseness
        loopStartStep.value = result.data.loopStartStep
        loopEndStep.value = result.data.loopEndStep
        setWorkRange(result.data.workRange)
        isLooping.value = result.data.isLooping
        audioSavedAt.value = result.data.audioSavedAt
      }
    } catch {
      // Corrupt payload falls back to safe defaults
    }
  }

  // Hydrate initially
  hydrateFromStorage()

  // Automatic persistence watch. The audio revision is written only through saveToStorage callers so
  // a commit marker cannot drift ahead of the audio snapshot document.
  if (typeof window !== 'undefined' && window.localStorage) {
    watch([bpm, key, scale, bars, swing, timingLooseness, loopStartStep, loopEndStep, workRange, isLooping], () => {
      void saveToStorage()
    })
  }

  return {
    bpm,
    key,
    scale,
    bars,
    swing,
    timingLooseness,
    loopStartStep,
    loopEndStep,
    workRange,
    isLooping,
    audioSavedAt,
    toConfig,
    setBpm,
    setKey,
    setScale,
    setBars,
    setSwing,
    setTimingLooseness,
    setLoop,
    setWorkRange,
    selectEntireProject,
    useLoopAsWorkRange,
    loopWorkRange,
    setLooping,
    setAudioSavedAt,
    reset,
    saveToStorage,
    hydrateFromStorage
  }
})
