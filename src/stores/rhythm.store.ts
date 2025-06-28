import { defineStore } from 'pinia'
import { SEQUENCER_STEPS_PER_BAR } from '@/ts/consts'
import type { AnyRhythm, RhythmCategory, SequencerStep } from '@/ts/types/rhythm.types'
import { saveState, loadState } from '@/utils/localStorage'

const LOCAL_STORAGE_KEY = 'rhythmStore'

/**
 * Pure State Management Store for Rhythm
 * Business Logic is handled in useRhythmSelection composable
 */
export const useRhythmStore = defineStore('rhythm', {
  state: () => {
    const defaults = {
      rhythm: null as AnyRhythm | null,
      rhythmCategory: 'melody' as RhythmCategory,
      useRandomRhythm: false,
      euclideanRotation: 0,
      customRhythmSequence: Array(SEQUENCER_STEPS_PER_BAR).fill(0) as SequencerStep[],
      useCustomRhythm: false
    }
    const stored = loadState(LOCAL_STORAGE_KEY)
    return { ...defaults, ...(stored || {}) }
  },

  getters: {
    isPresetRhythm: (state) => !state.useCustomRhythm && !state.rhythm?.name.includes('Euclidean')
  },

  actions: {
    /**
     * Set the current rhythm
     */
    setRhythm(rhythm: AnyRhythm | null) {
      this.rhythm = rhythm
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },

    /**
     * Set the rhythm category
     */
    setRhythmCategory(category: RhythmCategory) {
      this.rhythmCategory = category
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },

    /**
     * Set use random rhythm flag
     */
    setUseRandomRhythm(use: boolean) {
      this.useRandomRhythm = use
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },

    /**
     * Set euclidean rotation
     */
    setEuclideanRotation(rotation: number) {
      this.euclideanRotation = rotation
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },

    /**
     * Set custom rhythm sequence
     */
    setCustomRhythmSequence(sequence: SequencerStep[]) {
      this.customRhythmSequence = sequence
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },

    /**
     * Toggle custom rhythm mode
     */
    toggleCustomRhythm(enable: boolean) {
      this.useCustomRhythm = enable
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },

    /**
     * Set custom rhythm
     */
    setCustomRhythm(value: boolean) {
      this.useCustomRhythm = value
      saveState(LOCAL_STORAGE_KEY, this.$state)
    }
  }
})
