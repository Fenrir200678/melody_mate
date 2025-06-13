import { defineStore } from 'pinia'
import type { RhythmPattern } from '@/ts/models'

export const useRhythmStore = defineStore('rhythm', {
  state: () => ({
    rhythm: null as RhythmPattern | null
  }),

  actions: {
    setRhythm(rhythm: RhythmPattern) {
      this.rhythm = rhythm
    }
  }
})
