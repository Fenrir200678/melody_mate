import { defineStore } from 'pinia'
import type { AnyRhythm } from '@/ts/types/rhythm.types'
import { WEIGHTED_RHYTHMS } from '@/data/weighted_rhythms'
import type { RhythmCategory } from '@/ts/types/rhythm.types'
import { saveState, loadState } from '@/utils/localStorage'

const LOCAL_STORAGE_KEY = 'rhythmStore'

export const useRhythmStore = defineStore('rhythm', {
  state: () => ({
    ...loadState(LOCAL_STORAGE_KEY) || {
      rhythm: null as AnyRhythm | null,
      rhythmCategory: 'melody' as RhythmCategory,
      useRandomRhythm: false,
      euclideanRotation: 0
    }
  }),

  actions: {
    setRhythm(rhythm: AnyRhythm | null) {
      this.rhythm = rhythm
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setRhythmCategory(category: RhythmCategory) {
      this.rhythmCategory = category
      this.setDefaultRhythm()
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setUseRandomRhythm(use: boolean) {
      this.useRandomRhythm = use

      if (use) {
        this.rhythm = WEIGHTED_RHYTHMS.find((r) => r.category === this.rhythmCategory) || null
      }
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setEuclideanRotation(rotation: number) {
      this.euclideanRotation = rotation
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setDefaultRhythm() {
      const firstRhythm = WEIGHTED_RHYTHMS.find((r) => r.category === this.rhythmCategory) || null
      if (firstRhythm) {
        this.rhythm = firstRhythm
      }
      // No saveState here, as this is called internally by setRhythmCategory
      // which already saves the state.
    }
  }
})
