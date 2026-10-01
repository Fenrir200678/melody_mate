import { tryOnScopeDispose, useRafFn } from '@vueuse/core'
import { watch } from 'vue'
import { useAudioStore } from '../stores/audio.store'
import { useProjectStore } from '../stores/project.store'

export interface UseTransportOptions {
  autoStart?: boolean
  window?: Window
}

/**
 * Tracks playback transport time and playhead position.
 * Step-Guarding keeps audioStore.currentStep reactive writes restricted to actual
 * step changes. The continuous sub-step position feeds the markRaw `playhead` clock,
 * which the piano roll render loops pull every animation frame (no reactivity).
 */
export function useTransport(options: UseTransportOptions = {}) {
  const audioStore = useAudioStore()
  const projectStore = useProjectStore()

  function updatePlayhead(): void {
    const engine = audioStore.getPlaybackEngine()
    if (!engine) return

    const step = engine.getCurrentStep(projectStore.bpm)
    const time = engine.getCurrentTimeSeconds()

    // Step-Guarding: Avoid triggering reactivity if step has not advanced
    if (step !== audioStore.currentStep) {
      audioStore.currentStep = step
    }
    audioStore.currentTime = time

    // Continuous clock (markRaw, non-reactive) for frame-accurate playhead rendering
    audioStore.playhead.step =
      typeof engine.getPlayheadStep === 'function' ? engine.getPlayheadStep(projectStore.bpm) : step
  }

  const targetWindow = options.window ?? (typeof window !== 'undefined' ? window : (globalThis as unknown as Window))

  const { pause, resume, isActive } = useRafFn(
    () => {
      updatePlayhead()
    },
    { immediate: false, window: targetWindow }
  )

  // Synchronize RAF loop with audio playback status
  const unwatch = watch(
    () => audioStore.isPlaying,
    (playing) => {
      if (playing) {
        resume()
      } else {
        pause()
      }
    },
    { immediate: options.autoStart ?? true }
  )

  tryOnScopeDispose(() => {
    unwatch()
    pause()
  })

  return {
    isActive,
    pause,
    resume,
    updatePlayhead
  }
}
