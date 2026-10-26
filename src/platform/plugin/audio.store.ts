import { defineStore } from 'pinia'
import { computed, markRaw, ref } from 'vue'
import type { PlaybackEngine } from '../../audio/audio-runtime'
import type { useAudioStore as useBrowserAudioStore } from '../../stores/browser-audio.store'
import { useAudioPatches } from '../../composables/useAudioPatches'
import { useAudioAudition } from '../../composables/useAudioAudition'
import { DEFAULT_FOLLOW_PLAYHEAD } from '../../config/ui-defaults'
import { DEFAULT_PROJECT_SETTINGS } from '../../config/defaults'
import { nativeCall } from './bridge'

export const useAudioStore = defineStore('audio', () => {
  const initializationError = ref<string | null>(null)
  const isInitializingAudio = ref(false)
  const isPlaying = ref(false)
  const isPaused = ref(false)
  const currentStep = ref(0)
  const currentTime = ref(0)
  const playhead = markRaw({ step: 0 })
  const followPlayhead = ref(DEFAULT_FOLLOW_PLAYHEAD)
  const getPlaybackEngine = (): PlaybackEngine | null => null
  const patches = useAudioPatches(getPlaybackEngine)
  const initializeAudio = async (): Promise<PlaybackEngine | null> => {
    initializationError.value =
      'Use DAW transport and a receiving instrument. Browser audition is unavailable in this prototype.'
    return null
  }
  const audition = useAudioAudition({
    initializeAudio,
    getEngine: getPlaybackEngine,
    initializationError,
    getBpm: () => DEFAULT_PROJECT_SETTINGS.bpm
  })
  const noOperation = (..._args: unknown[]) => {}
  const panic = () => {
    void nativeCall('panic').catch((error: Error) => {
      initializationError.value = error.message
    })
  }
  return {
    ...patches,
    ...audition,
    getPlaybackEngine,
    initializeAudio,
    initializationError,
    isInitializingAudio,
    playbackEngine: computed(getPlaybackEngine),
    isPlaying,
    isPaused,
    currentStep,
    currentTime,
    playhead,
    followPlayhead,
    setFollowPlayhead: (value: boolean) => {
      followPlayhead.value = value
    },
    toggleFollowPlayhead: () => {
      followPlayhead.value = !followPlayhead.value
    },
    setPlaybackEngine: noOperation,
    syncSchedule: noOperation,
    syncLeadSchedule: noOperation,
    syncChordSchedule: noOperation,
    play: async () => {
      initializationError.value = 'Start playback in the DAW.'
    },
    pause: noOperation,
    stop: noOperation,
    seek: noOperation,
    seekRelativeBars: noOperation,
    setBpm: noOperation,
    setLooping: noOperation,
    applyLoop: noOperation,
    reset: noOperation,
    panic
  }
}) satisfies (
  ...args: Parameters<typeof useBrowserAudioStore>
) => Pick<
  ReturnType<typeof useBrowserAudioStore>,
  Exclude<keyof ReturnType<typeof useBrowserAudioStore>, `$${string}` | `_${string}`>
>
