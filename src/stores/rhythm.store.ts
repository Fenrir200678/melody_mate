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
      useCustomRhythm: false,
      numberOfBars: 1
    }

    const stored = loadState(LOCAL_STORAGE_KEY)
    const initialState = { ...defaults, ...(stored || {}) }

    // Post-load consistency check to ensure sequence length matches number of bars
    const expectedLength = initialState.numberOfBars * SEQUENCER_STEPS_PER_BAR
    if (initialState.customRhythmSequence.length !== expectedLength) {
      const oldSequence = initialState.customRhythmSequence
      const newSequence = Array(expectedLength).fill(0)
      const stepsToCopy = Math.min(oldSequence.length, expectedLength)
      for (let i = 0; i < stepsToCopy; i++) {
        newSequence[i] = oldSequence[i]
      }
      initialState.customRhythmSequence = newSequence
    }

    return initialState
  },

  getters: {
    isPresetRhythm: (state) => !state.useCustomRhythm && !state.rhythm?.name.includes('Euclidean'),
    totalSteps: (state) => state.numberOfBars * SEQUENCER_STEPS_PER_BAR
  },

  actions: {
    /**
     * Set the number of bars and update the sequence length, preserving existing steps.
     */
    setNumberOfBars(bars: number) {
      const newTotalSteps = bars * SEQUENCER_STEPS_PER_BAR
      const oldSequence = this.customRhythmSequence
      const newSequence = Array(newTotalSteps).fill(0)

      const stepsToCopy = Math.min(oldSequence.length, newTotalSteps)
      for (let i = 0; i < stepsToCopy; i++) {
        newSequence[i] = oldSequence[i]
      }

      this.numberOfBars = bars
      this.customRhythmSequence = newSequence
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
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
