import { computed } from 'vue'
import type { ChordFunction } from '@/core/theory/chord-function'
import { getChordFunction } from '@/core/theory/chord-function'
import { voiceLeadingDistance } from '@/core/theory/voice-leading'
import { useAudioStore } from '@/stores/audio.store'
import { useHarmonyStore } from '@/stores/harmony.store'

/**
 * Read model and mutations for the chord currently under edit in the inspector.
 * Distances are computed against the neighbouring chords so the inspector can show
 * how much the voices move on either side of the selection.
 */
export function useSelectedChord() {
  const harmonyStore = useHarmonyStore()
  const audioStore = useAudioStore()

  const selectedChord = computed(() => harmonyStore.selectedChord)

  const selectedIndex = computed(() => {
    if (!selectedChord.value) return -1
    return harmonyStore.chords.findIndex((c) => c.id === selectedChord.value?.id)
  })

  const chordFunction = computed<ChordFunction>(() =>
    selectedChord.value ? getChordFunction(selectedChord.value, harmonyStore.diatonicPalette) : 'custom'
  )

  const timingLabel = computed(() => {
    const chord = selectedChord.value
    if (!chord) return ''
    const startNum = (chord.startBar + 1).toFixed(2).replace(/\.00$/, '')
    return `Bar ${startNum} · ${chord.durationBars} Bar${chord.durationBars > 1 ? 's' : ''}`
  })

  const prevDistance = computed<number | null>(() => {
    const idx = selectedIndex.value
    if (idx <= 0 || !selectedChord.value) return null
    return voiceLeadingDistance(harmonyStore.chords[idx - 1].voicing, selectedChord.value.voicing)
  })

  const nextDistance = computed<number | null>(() => {
    const idx = selectedIndex.value
    if (idx < 0 || idx >= harmonyStore.chords.length - 1 || !selectedChord.value) return null
    return voiceLeadingDistance(selectedChord.value.voicing, harmonyStore.chords[idx + 1].voicing)
  })

  function audition(): void {
    if (selectedChord.value) {
      audioStore.auditionChord(selectedChord.value.voicing)
    }
  }

  function transposeOctave(delta: number): void {
    if (selectedChord.value) {
      harmonyStore.transposeChordVoicingOctave(selectedChord.value.id, delta)
    }
  }

  function setInversion(inversion: 0 | 1 | 2 | 3): void {
    if (selectedChord.value) {
      harmonyStore.setInversion(selectedChord.value.id, inversion)
    }
  }

  function setDuration(durationBars: number): void {
    if (selectedChord.value && durationBars > 0) {
      harmonyStore.setChordDuration(selectedChord.value.id, durationBars)
    }
  }

  function reorder(direction: 'up' | 'down'): void {
    if (selectedChord.value) {
      harmonyStore.reorderChord(selectedChord.value.id, direction)
    }
  }

  function duplicate(): void {
    if (selectedChord.value) {
      harmonyStore.duplicateChord(selectedChord.value.id)
    }
  }

  function remove(): void {
    if (selectedChord.value) {
      harmonyStore.removeChord(selectedChord.value.id)
    }
  }

  return {
    selectedChord,
    selectedIndex,
    chordFunction,
    timingLabel,
    prevDistance,
    nextDistance,
    audition,
    transposeOctave,
    setInversion,
    setDuration,
    reorder,
    duplicate,
    remove
  }
}
