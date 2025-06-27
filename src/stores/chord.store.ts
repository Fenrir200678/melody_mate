import { defineStore } from 'pinia'
import type { Chord } from '@/ts/models/Chord'
import { generateChordProgression } from '@/services/ChordService'
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

export const useChordStore = defineStore('chord', {
  state: (): ChordStoreState => ({
    ...((loadState(LOCAL_STORAGE_KEY) as ChordStoreState) || defaultState)
  }),

  actions: {
    addChordToProgression(chord: Chord) {
      // Ensure currentProgression is defined before accessing it
      if (this.currentProgression && this.currentProgression.length < 8) {
        this.currentProgression.push(chord)
        saveState(LOCAL_STORAGE_KEY, this.$state)
      } else if (this.currentProgression) {
        console.warn('Maximum of 8 chords reached in progression.')
      } else {
        console.error('currentProgression is undefined.')
      }
    },
    removeChordFromProgression(index: number) {
      if (this.currentProgression) {
        this.currentProgression.splice(index, 1)
        saveState(LOCAL_STORAGE_KEY, this.$state)
      }
    },
    reorderProgression(oldIndex: number, newIndex: number) {
      if (this.currentProgression) {
        const [removed] = this.currentProgression.splice(oldIndex, 1)
        this.currentProgression.splice(newIndex, 0, removed)
        saveState(LOCAL_STORAGE_KEY, this.$state)
      }
    },
    clearProgression() {
      this.currentProgression = []
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setChords(chords: Chord[]) {
      this.chords = chords
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setUseChords(use: boolean) {
      this.useChords = use
      if (use && this.selectedProgressionType === 'predefined' && this.selectedPredefinedProgressionName) {
        this.loadPredefinedProgression(this.selectedPredefinedProgressionName)
      }
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setSelectedProgressionType(type: 'custom' | 'predefined') {
      this.selectedProgressionType = type
      if (type === 'predefined' && this.selectedPredefinedProgressionName) {
        this.loadPredefinedProgression(this.selectedPredefinedProgressionName)
      }
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setSelectedPredefinedProgressionName(name: string) {
      this.selectedPredefinedProgressionName = name
      this.loadPredefinedProgression(name)
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    loadPredefinedProgression(progressionName: string) {
      // The generateChordProgression function already uses the composition store.
      this.currentProgression = generateChordProgression(progressionName)
      saveState(LOCAL_STORAGE_KEY, this.$state)
    }
  }
})
