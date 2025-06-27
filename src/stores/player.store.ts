import { defineStore } from 'pinia'
import { useMelodyStore } from './melody.store'
import { dynamics } from '@/data/dynamics-data'
import type { Dynamic } from '@/ts/types/dynamics.types'
import { saveState, loadState } from '@/utils/localStorage'

const LOCAL_STORAGE_KEY = 'playerStore'

const melodyStore = useMelodyStore()

export const usePlayerStore = defineStore('player', {
  state: () => ({
    ...loadState(LOCAL_STORAGE_KEY) || {
      isPlaying: false,
      loop: true,
      selectedInstrument: 99,
      useFixedVelocity: false,
      fixedVelocity: 100,
      useDynamics: true,
      selectedDynamic: dynamics[4] as Dynamic,
      bpm: 120
    }
  }),

  actions: {
    setIsPlaying(playing: boolean) {
      this.isPlaying = playing
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setLoop(loop: boolean) {
      this.loop = loop

      const player = document.getElementById('player')
      if (player?.hasAttribute('loop')) {
        player?.removeAttribute('loop')
      } else {
        player?.setAttribute('loop', 'true')
      }
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
      melodyStore.generateMidiFile()
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setFixedVelocity(velocity: number) {
      this.fixedVelocity = velocity

      if (this.useDynamics) {
        this.useDynamics = false
      }
      melodyStore.generateMidiFile()
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setUseDynamics(use: boolean) {
      this.useDynamics = use

      if (use) {
        this.useFixedVelocity = false
      }

      melodyStore.generateMidiFile()
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setSelectedDynamic(dynamic: Dynamic) {
      this.selectedDynamic = dynamic
      melodyStore.generateMidiFile()
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setBpm(bpm: number) {
      this.bpm = bpm
      melodyStore.generateMidiFile()
      saveState(LOCAL_STORAGE_KEY, this.$state)
    }
  }
})
