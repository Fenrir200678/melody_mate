import { computed } from 'vue'
import type { Chord } from '@/ts/models/Chord'
import { useChordStore } from '@/stores/chord.store'
import { generateChordProgression } from '@/services/ChordService'

/**
 * Composable for chord progression management
 * Separates Store State from Service Logic
 */
export function useChordProgression() {
  const chordStore = useChordStore()

  /**
   * Add chord to progression with validation
   * Extracted Business Logic from addChordToProgression action
   */
  const addChordToProgression = (chord: Chord): void => {
    const currentProgression = chordStore.currentProgression

    // Ensure currentProgression is defined before accessing it
    if (currentProgression && currentProgression.length < 8) {
      chordStore.addChordToProgression(chord)
    } else if (currentProgression) {
      console.warn('Maximum of 8 chords reached in progression.')
    } else {
      console.error('currentProgression is undefined.')
    }
  }

  /**
   * Remove chord from progression by index
   */
  const removeChordFromProgression = (index: number): void => {
    chordStore.removeChordFromProgression(index)
  }

  /**
   * Reorder progression chords
   */
  const reorderProgression = (oldIndex: number, newIndex: number): void => {
    chordStore.reorderProgression(oldIndex, newIndex)
  }

  /**
   * Clear entire progression
   */
  const clearProgression = (): void => {
    chordStore.clearProgression()
  }

  /**
   * Set available chords for progression building
   */
  const setChords = (chords: Chord[]): void => {
    chordStore.setChords(chords)
  }

  /**
   * Enable/disable chord usage and load predefined progression if needed
   */
  const setUseChords = (use: boolean): void => {
    chordStore.setUseChords(use)

    if (use && chordStore.selectedProgressionType === 'predefined' && chordStore.selectedPredefinedProgressionName) {
      loadPredefinedProgression(chordStore.selectedPredefinedProgressionName)
    }
  }

  /**
   * Set progression type (custom or predefined)
   */
  const setSelectedProgressionType = (type: 'custom' | 'predefined'): void => {
    chordStore.setSelectedProgressionType(type)

    if (type === 'predefined' && chordStore.selectedPredefinedProgressionName) {
      loadPredefinedProgression(chordStore.selectedPredefinedProgressionName)
    }
  }

  /**
   * Set predefined progression name and load it
   */
  const setSelectedPredefinedProgressionName = (name: string): void => {
    chordStore.setSelectedPredefinedProgressionName(name)
    loadPredefinedProgression(name)
  }

  /**
   * Load predefined progression using ChordService
   * Extracted Business Logic from loadPredefinedProgression action
   */
  const loadPredefinedProgression = (progressionName: string): void => {
    try {
      // The generateChordProgression function already uses the composition store.
      const newChords = generateChordProgression(progressionName)
      chordStore.setCurrentProgression(newChords)
      chordStore.setChords(newChords)
    } catch (error) {
      console.error('Error loading predefined progression:', error)
    }
  }

  // Reactive computed properties
  const currentProgression = computed(() => chordStore.currentProgression)
  const chords = computed(() => chordStore.chords)
  const useChords = computed(() => chordStore.useChords)
  const selectedProgressionType = computed(() => chordStore.selectedProgressionType)
  const selectedPredefinedProgressionName = computed(() => chordStore.selectedPredefinedProgressionName)

  // Computed helpers
  const hasProgression = computed(() => currentProgression.value && currentProgression.value.length > 0)
  const isProgressionFull = computed(() => currentProgression.value && currentProgression.value.length >= 8)
  const progressionLength = computed(() => (currentProgression.value ? currentProgression.value.length : 0))

  return {
    // State
    currentProgression,
    chords,
    useChords,
    selectedProgressionType,
    selectedPredefinedProgressionName,
    hasProgression,
    isProgressionFull,
    progressionLength,

    // Actions
    addChordToProgression,
    removeChordFromProgression,
    reorderProgression,
    clearProgression,
    setChords,
    setUseChords,
    setSelectedProgressionType,
    setSelectedPredefinedProgressionName,
    loadPredefinedProgression
  }
}
