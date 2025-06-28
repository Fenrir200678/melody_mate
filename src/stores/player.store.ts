import { defineStore } from 'pinia'
import { dynamics } from '@/data/dynamics-data'
import type { Dynamic } from '@/ts/types/dynamics.types'
import { saveState, loadState } from '@/utils/localStorage'

const LOCAL_STORAGE_KEY = 'playerStore'

/**
 * Pure State Management Store for Player Settings
 */
export const usePlayerStore = defineStore('player', {
  state: () => ({
    ...(loadState(LOCAL_STORAGE_KEY) || {
      isPlaying: false,
      selectedInstrument: 99,
      useFixedVelocity: false,
      fixedVelocity: 100,
      useDynamics: true,
      selectedDynamic: dynamics[4] as Dynamic,
      bpm: 120
    })
  }),

  actions: {
    setIsPlaying(playing: boolean) {
      this.isPlaying = playing
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },

    setSelectedInstrument(instrument: number) {
      this.selectedInstrument = instrument
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setUseFixedVelocity(use: boolean) {
      this.useFixedVelocity = use

      if (use) {
        this.useDynamics = false
      }
      saveState(LOCAL_STORAGE_KEY, this.$state)
      // Note: MIDI regeneration should be handled in components via composables
    },
    setFixedVelocity(velocity: number) {
      this.fixedVelocity = velocity

      if (this.useDynamics) {
        this.useDynamics = false
      }
      saveState(LOCAL_STORAGE_KEY, this.$state)
      // Note: MIDI regeneration should be handled in components via composables
    },
    setUseDynamics(use: boolean) {
      this.useDynamics = use

      if (use) {
        this.useFixedVelocity = false
      }

      saveState(LOCAL_STORAGE_KEY, this.$state)
      // Note: MIDI regeneration should be handled in components via composables
    },
    setSelectedDynamic(dynamic: Dynamic) {
      this.selectedDynamic = dynamic
      saveState(LOCAL_STORAGE_KEY, this.$state)
      // Note: MIDI regeneration should be handled in components via composables
    },
    setBpm(bpm: number) {
      this.bpm = bpm
      saveState(LOCAL_STORAGE_KEY, this.$state)
      // Note: MIDI regeneration should be handled in components via composables
    }
  }
})
