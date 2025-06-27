import { defineStore } from 'pinia'
import type { Chord } from '@/ts/models/Chord'
import { saveState, loadState } from '@/utils/localStorage'

const LOCAL_STORAGE_KEY = 'chordStore'

type ChordStoreState = {
  currentProgression: Chord[]
  chords: Chord[]
  useChords: boolean
  selectedProgressionType: 'custom' | 'predefined'
  selectedPredefinedProgressionName: string
}

const defaultState: ChordStoreState = {
  currentProgression: [] as Chord[],
  chords: [] as Chord[],
  useChords: false,
  selectedProgressionType: 'predefined' as 'custom' | 'predefined',
  selectedPredefinedProgressionName: 'I-V-vi-IV'
}

/**
 * Pure State Management Store for Chords
 * Business Logic is handled in useChordProgression composable
 */
export const useChordStore = defineStore('chord', {
  state: (): ChordStoreState => ({
    ...((loadState(LOCAL_STORAGE_KEY) as ChordStoreState) || defaultState)
  }),

  actions: {
    /**
     * Set the current chord progression
     */
    setCurrentProgression(progression: Chord[]) {
      this.currentProgression = progression
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },

    /**
     * Add chord to progression
     */
    addChordToProgression(chord: Chord) {
      if (this.currentProgression) {
        this.currentProgression.push(chord)
        saveState(LOCAL_STORAGE_KEY, this.$state)
      }
    },

    /**
     * Remove chord from progression by index
     */
    removeChordFromProgression(index: number) {
      if (this.currentProgression) {
        this.currentProgression.splice(index, 1)
        saveState(LOCAL_STORAGE_KEY, this.$state)
      }
    },

    /**
     * Reorder progression chords
     */
    reorderProgression(oldIndex: number, newIndex: number) {
      if (this.currentProgression) {
        const [removed] = this.currentProgression.splice(oldIndex, 1)
        this.currentProgression.splice(newIndex, 0, removed)
        saveState(LOCAL_STORAGE_KEY, this.$state)
      }
    },

    /**
     * Clear progression
     */
    clearProgression() {
      this.currentProgression = []
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },

    /**
     * Set available chords
     */
    setChords(chords: Chord[]) {
      this.chords = chords
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },

    /**
     * Set use chords flag
     */
    setUseChords(use: boolean) {
      this.useChords = use
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },

    /**
     * Set selected progression type
     */
    setSelectedProgressionType(type: 'custom' | 'predefined') {
      this.selectedProgressionType = type
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },

    /**
     * Set selected predefined progression name
     */
    setSelectedPredefinedProgressionName(name: string) {
      this.selectedPredefinedProgressionName = name
      saveState(LOCAL_STORAGE_KEY, this.$state)
    }
  }
})
