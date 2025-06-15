import { defineStore } from 'pinia'
import type { AnyRhythm } from '@/ts/types/rhythm.types'
import { WEIGHTED_RHYTHMS } from '@/data/weighted_rhythms'
import type { RhythmCategory } from '@/ts/types/rhythm.types'

export const useRhythmStore = defineStore('rhythm', {
  state: () => ({
    rhythm: null as AnyRhythm | null,
    rhythmCategory: 'melody' as RhythmCategory,
    useRandomRhythm: false,
    euclideanRotation: 0
  }),

  actions: {
    setRhythm(rhythm: AnyRhythm | null) {
      this.rhythm = rhythm
    },
    setRhythmCategory(category: RhythmCategory) {
      this.rhythmCategory = category
      this.setDefaultRhythm()
    },
    setUseRandomRhythm(use: boolean) {
      this.useRandomRhythm = use

      if (use) {
        this.rhythm = WEIGHTED_RHYTHMS.find((r) => r.category === this.rhythmCategory) || null
      }
    },
    setEuclideanRotation(rotation: number) {
      this.euclideanRotation = rotation
    },
    setDefaultRhythm() {
      const firstRhythm = WEIGHTED_RHYTHMS.find((r) => r.category === this.rhythmCategory) || null
      if (firstRhythm) {
        this.rhythm = firstRhythm
      }
    }
  }
})
