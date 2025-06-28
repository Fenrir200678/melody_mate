import { ref, computed, watch } from 'vue'
import { useMelodyStore } from '@/stores/melody.store'
import { usePlayerStore } from '@/stores/player.store'
import { convertTicksToNotation } from '@/utils/duration'

export function usePlaybackVisualization() {
  const melodyStore = useMelodyStore()
  const playerStore = usePlayerStore()

  const currentNoteIndex = ref(-1)
  const playbackTimeouts = ref<number[]>([])

  // Convert duration notation to milliseconds
  function convertDurationToMs(duration: string, bpm: number): number {
    const notation = convertTicksToNotation(duration)
    const beatDuration = 60000 / bpm // milliseconds per beat (quarter note)

    const durationMap: Record<string, number> = {
      '1n': beatDuration * 4, // Whole note = 4 beats
      '2n.': beatDuration * 3, // Dotted half = 3 beats
      '2n': beatDuration * 2, // Half note = 2 beats
      '4n.': beatDuration * 1.5, // Dotted quarter = 1.5 beats
      '4n': beatDuration, // Quarter note = 1 beat
      '8n.': beatDuration * 0.75, // Dotted eighth = 0.75 beats
      '8n': beatDuration * 0.5, // Eighth note = 0.5 beats
      '16n.': beatDuration * 0.375, // Dotted sixteenth = 0.375 beats
      '16n': beatDuration * 0.25, // Sixteenth note = 0.25 beats
      '32n': beatDuration * 0.125, // Thirty-second = 0.125 beats
      '64n': beatDuration * 0.0625 // Sixty-fourth = 0.0625 beats
    }

    return durationMap[notation] || beatDuration
  }

  // Start playback visualization
  function startPlayback() {
    if (!melodyStore.melody?.notes.length) return

    currentNoteIndex.value = 0

    const bpm = playerStore.bpm || 120
    let cumulativeTime = 0

    // Clear any existing timeouts
    clearAllTimeouts()

    melodyStore.melody.notes.forEach((note, index) => {
      const noteDuration = convertDurationToMs(note.duration, bpm)

      const timeoutId = setTimeout(() => {
        if (!!playerStore.isPlaying) {
          currentNoteIndex.value = index
        }
      }, cumulativeTime)

      playbackTimeouts.value.push(timeoutId)
      cumulativeTime += noteDuration
    })

    // Reset after melody finishes
    const resetTimeoutId = setTimeout(() => {
      if (!!playerStore.isPlaying) {
        stopPlayback()
      }
    }, cumulativeTime)

    playbackTimeouts.value.push(resetTimeoutId)
  }

  // Stop playback visualization
  function stopPlayback() {
    currentNoteIndex.value = -1
    clearAllTimeouts()
  }

  // Clear all timeouts
  function clearAllTimeouts() {
    playbackTimeouts.value.forEach((timeoutId) => {
      clearTimeout(timeoutId)
    })
    playbackTimeouts.value = []
  }

  // Check if a note is currently playing
  function isNoteActive(index: number): boolean {
    return !!playerStore.isPlaying && currentNoteIndex.value === index
  }

  // Watch playerStore.isPlaying to start/stop visualization
  watch(
    () => playerStore.isPlaying,
    (newValue, oldValue) => {
      if (newValue && !oldValue) {
        // Started playing
        startPlayback()
      } else if (!newValue && oldValue) {
        // Stopped playing
        stopPlayback()
      }
    }
  )

  const totalDuration = computed(() => {
    if (!melodyStore.melody?.notes.length) return 0

    const bpm = playerStore.bpm || 120
    return melodyStore.melody.notes.reduce((total, note) => {
      return total + convertDurationToMs(note.duration, bpm)
    }, 0)
  })

  const progress = computed(() => {
    if (!playerStore.isPlaying || currentNoteIndex.value < 0) return 0
    return ((currentNoteIndex.value + 1) / (melodyStore.melody?.notes.length || 1)) * 100
  })

  return {
    currentNoteIndex,
    isPlaying: computed(() => !!playerStore.isPlaying),
    isNoteActive,
    totalDuration,
    progress
  }
}
