import { defineStore } from 'pinia'
import { computed, markRaw, onScopeDispose, ref, watch } from 'vue'
import { PlaybackEngine, ensureAudioContextRunning, rampTransportBpm } from '../audio/audio-runtime'
import { useAudioAudition } from '../composables/useAudioAudition'
import { useAudioPatches } from '../composables/useAudioPatches'
import { DEFAULT_FOLLOW_PLAYHEAD } from '../config/ui-defaults'
import { STEPS_PER_BAR } from '../core/schemas/project.schema'
import { useHarmonyStore } from './harmony.store'
import { useMelodyStore } from './melody.store'
import { useMixerStore } from './mixer.store'
import { useProjectStore } from './project.store'
import { useMidiOutputStore } from './midi-output.store'
import { useUiStore } from './ui.store'

export type { AudioMacros, MacroConfig } from './mixer.store'

export const useAudioStore = defineStore('audio', () => {
  let customEngine: PlaybackEngine | null = null
  let engineInstance: PlaybackEngine | null = null

  const initializationError = ref<string | null>(null)
  const isInitializingAudio = ref(false)
  let startRequest = 0
  let disposed = false
  let initializationPromise: Promise<PlaybackEngine | null> | null = null

  function getEngine(): PlaybackEngine | null {
    return customEngine ?? engineInstance
  }

  const patches = useAudioPatches(getEngine)

  function initializeAudio(): Promise<PlaybackEngine | null> {
    if (getEngine()) return Promise.resolve(getEngine())
    if (initializationPromise) return initializationPromise
    initializationPromise = (async () => {
      isInitializingAudio.value = true
      try {
        if (!(await ensureAudioContextRunning()))
          throw new Error('Audio output is blocked. Try again after interacting with the page.')
        const engine = new PlaybackEngine(undefined, useMidiOutputStore().getRuntime(), () => {
          const harmony = useHarmonyStore()
          return harmony.useChords && !harmony.isMuted
        })
        const mixerStore = useMixerStore()
        mixerStore.applyToEngine(engine)

        engine.setLeadPreset(patches.activeLeadPatch.value)
        engine.setChordPreset(patches.activeChordPatch.value)

        await engine.initializeDiagnostics()
        mixerStore.syncDiagnostics(engine)

        if (disposed) {
          engine.dispose()
          return null
        }
        engineInstance = engine
        initializationError.value = null
        return engine
      } catch (error) {
        initializationError.value = error instanceof Error ? error.message : 'Audio initialization failed.'
        return null
      } finally {
        isInitializingAudio.value = false
        initializationPromise = null
      }
    })()
    return initializationPromise
  }

  function setPlaybackEngine(engine: PlaybackEngine | null): void {
    customEngine = engine
  }

  const isPlaying = ref<boolean>(false)
  const isPaused = ref<boolean>(false)
  const currentStep = ref<number>(0)
  const currentTime = ref<number>(0)

  // Continuous (sub-step) playhead clock updated every animation frame during playback.
  // markRaw keeps it OUTSIDE Vue reactivity: the canvas/ruler rAF loops pull the value
  // per frame, avoiding a 60–120Hz reactive flood (see useTransport Step-Guarding).
  const playhead = markRaw({ step: 0 })
  const followPlayhead = ref<boolean>(DEFAULT_FOLLOW_PLAYHEAD)

  const audition = useAudioAudition({
    initializeAudio,
    getEngine,
    initializationError,
    getBpm: () => useProjectStore().bpm
  })

  watch(
    () => useUiStore().activeStudioDock,
    (_, previous) => {
      if (previous === 'chord') audition.stopProgressionPreview()
      if (previous === 'arp') useMelodyStore().stopArpAudition()
    },
    { flush: 'sync' }
  )

  function syncSchedule(bpm?: number): void {
    const engine = getEngine()
    if (!engine) return

    const melodyStore = useMelodyStore()
    const harmonyStore = useHarmonyStore()
    const projectStore = useProjectStore()
    const config = projectStore.toConfig()
    if (bpm !== undefined) config.bpm = bpm
    engine.schedule(melodyStore.notes, harmonyStore.chords, config, bpm !== undefined)
  }

  function syncLeadSchedule(replace = false): void {
    const engine = getEngine()
    if (!engine) return

    const melodyStore = useMelodyStore()
    const projectStore = useProjectStore()

    engine.scheduleLead(melodyStore.notes, projectStore.toConfig(), replace)
  }

  function syncChordSchedule(): void {
    const engine = getEngine()
    if (!engine) return

    const harmonyStore = useHarmonyStore()
    const projectStore = useProjectStore()
    engine.scheduleChords(harmonyStore.chords, projectStore.toConfig())
  }

  watch([() => useProjectStore().swing, () => useProjectStore().timingLooseness], () => {
    if (isPlaying.value || isPaused.value) syncSchedule()
  })

  async function play(): Promise<void> {
    const request = ++startRequest
    const uiStore = useUiStore()
    const projectStore = useProjectStore()

    if (uiStore.playFromLoopStart && projectStore.isLooping) {
      if (
        !isPaused.value ||
        currentStep.value < projectStore.loopStartStep ||
        currentStep.value >= projectStore.loopEndStep
      ) {
        seek(projectStore.loopStartStep)
      }
    }

    const engine = await initializeAudio()
    if (!engine || disposed || request !== startRequest) return
    engine.seekToStep(currentStep.value)
    syncSchedule()
    try {
      await engine.play()
    } catch (error) {
      initializationError.value = error instanceof Error ? error.message : 'Audio playback failed.'
      return
    }
    if (disposed || request !== startRequest) return
    playhead.step = currentStep.value
    isPlaying.value = true
    isPaused.value = false
  }

  function pause(): void {
    ++startRequest
    const engine = getEngine()
    if (engine) {
      engine.pause()
    }
    isPlaying.value = false
    isPaused.value = true

    const uiStore = useUiStore()
    if (uiStore.returnToStartOnPause) {
      const projectStore = useProjectStore()
      const targetStep = uiStore.playFromLoopStart && projectStore.isLooping ? projectStore.loopStartStep : 0
      seek(targetStep)
    }
  }

  function stop(): void {
    ++startRequest
    audition.stopNotesAudition()
    audition.stopProgressionPreview()
    audition.stopRhythmPreview()
    const uiStore = useUiStore()
    const projectStore = useProjectStore()

    let targetStep = 0
    if (uiStore.playFromLoopStart && projectStore.isLooping) {
      if (currentStep.value === projectStore.loopStartStep) {
        targetStep = 0
      } else {
        targetStep = projectStore.loopStartStep
      }
    }

    const engine = getEngine()
    if (engine) {
      engine.stop(targetStep)
    }
    isPlaying.value = false
    isPaused.value = false
    seek(targetStep)
    currentTime.value = 0
  }

  watch(
    () => useProjectStore().loopStartStep,
    (newStart, oldStart) => {
      const projectStore = useProjectStore()
      const uiStore = useUiStore()
      if (
        newStart !== oldStart &&
        !isPlaying.value &&
        !isPaused.value &&
        uiStore.playFromLoopStart &&
        projectStore.isLooping
      ) {
        seek(newStart)
      }
    }
  )

  function seek(step: number): void {
    const clamped = Math.max(0, Math.round(step))
    currentStep.value = clamped
    playhead.step = clamped
    getEngine()?.seekToStep(clamped)
  }

  function seekRelativeBars(deltaBars: number): void {
    seek(Math.max(0, currentStep.value + deltaBars * STEPS_PER_BAR))
  }

  function setFollowPlayhead(enabled: boolean): void {
    followPlayhead.value = enabled
  }

  function toggleFollowPlayhead(): void {
    followPlayhead.value = !followPlayhead.value
  }

  function setBpm(bpm: number): void {
    try {
      rampTransportBpm(bpm)
      getEngine()?.setTempo(bpm)
    } catch {
      // The transport may be unavailable before audio initialization.
    }
    syncSchedule(bpm)
  }

  function setLooping(val: boolean): void {
    const projectStore = useProjectStore()
    getEngine()?.setLoop(projectStore.loopStartStep, projectStore.loopEndStep, val)
  }

  watch(
    [() => useProjectStore().loopStartStep, () => useProjectStore().loopEndStep, () => useProjectStore().isLooping],
    () => applyLoop(),
    { flush: 'sync' }
  )

  function applyLoop(): void {
    const projectStore = useProjectStore()
    getEngine()?.setLoop(projectStore.loopStartStep, projectStore.loopEndStep, projectStore.isLooping)
  }

  function reset(): void {
    stop()
    audition.stopRhythmPreview()
    followPlayhead.value = DEFAULT_FOLLOW_PLAYHEAD
    patches.resetPatches()
    useMixerStore().reset()
  }

  function panic(): void {
    ++startRequest
    if (!getEngine()) useMidiOutputStore().getRuntime().panic()
    audition.panic()
  }

  watch(
    [() => useHarmonyStore().isMuted, () => useHarmonyStore().useChords],
    () => {
      getEngine()?.syncOutputAudibility()
    },
    { flush: 'sync' }
  )

  onScopeDispose(() => {
    disposed = true
    ++startRequest
    engineInstance?.dispose()
  })

  const playbackEngine = computed<PlaybackEngine | null>(() => getEngine())

  return {
    getPlaybackEngine: getEngine,
    initializeAudio,
    initializationError,
    isInitializingAudio,
    playbackEngine,
    isPlaying,
    isPaused,
    currentStep,
    currentTime,
    playhead,
    followPlayhead,
    setFollowPlayhead,
    toggleFollowPlayhead,
    activeLeadPreset: patches.activeLeadPreset,
    activeChordPreset: patches.activeChordPreset,
    activeLeadPatch: patches.activeLeadPatch,
    activeChordPatch: patches.activeChordPatch,
    auditioningId: audition.auditioningId,
    isPreviewingProgression: audition.isPreviewingProgression,
    previewingChordId: audition.previewingChordId,
    setPlaybackEngine,
    syncSchedule,
    syncLeadSchedule,
    syncChordSchedule,
    play,
    pause,
    stop,
    seek,
    seekRelativeBars,
    setBpm,
    setLooping,
    applyLoop,
    setLeadPreset: patches.setLeadPreset,
    setChordPreset: patches.setChordPreset,
    setLeadPatch: patches.setLeadPatch,
    setChordPatch: patches.setChordPatch,
    setTrackSound: patches.setTrackSound,
    reset,
    auditionPitch: audition.auditionPitch,
    auditionChord: audition.auditionChord,
    auditionNotes: audition.auditionNotes,
    stopNotesAudition: audition.stopNotesAudition,
    previewProgression: audition.previewProgression,
    stopProgressionPreview: audition.stopProgressionPreview,
    previewRhythm: audition.previewRhythm,
    stopRhythmPreview: audition.stopRhythmPreview,
    panic
  }
})
