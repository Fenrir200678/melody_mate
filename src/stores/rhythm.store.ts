import { defineStore } from 'pinia'
import type { AnyRhythm } from '@/ts/types/rhythm.types'

export const useRhythmStore = defineStore('rhythm', {
  state: () => ({
    rhythm: null as AnyRhythm | null,
    euclideanRotation: 0,
  }),

  actions: {
    setRhythm(rhythm: AnyRhythm | null) {
      this.rhythm = rhythm
    },
    setEuclideanRotation(rotation: number) {
      this.euclideanRotation = rotation
    },
  },
})
