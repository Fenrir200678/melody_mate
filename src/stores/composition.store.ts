import { defineStore } from 'pinia'
import { saveState, loadState } from '@/utils/localStorage'

const LOCAL_STORAGE_KEY = 'compositionStore'

/**
 * Pure State Management Store for Composition Settings
 */
export const useCompositionStore = defineStore('composition', {
  state: () => ({
    ...(loadState(LOCAL_STORAGE_KEY) || {
      scaleName: 'minor',
      key: 'A',
      bars: 4,
      lastBars: 4,
      minOctave: 3,
      maxOctave: 4
    })
  }),

  actions: {
    setScaleName(name: string) {
      this.scaleName = name
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setKey(key: string) {
      this.key = key
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setBars(bars: number) {
      this.lastBars = this.bars
      this.bars = bars
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setMinOctave(octave: number) {
      this.minOctave = octave
      saveState(LOCAL_STORAGE_KEY, this.$state)
      // Note: MIDI regeneration should be handled in components via composables
    },
    setMaxOctave(octave: number) {
      this.maxOctave = octave
      saveState(LOCAL_STORAGE_KEY, this.$state)
      // Note: MIDI regeneration should be handled in components via composables
    }
  }
})
