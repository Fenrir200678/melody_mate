import { defineStore } from 'pinia'
import { useMelodyStore } from './melody.store'
import { dynamics } from '@/data/dynamics-data'
import type { Dynamic } from '@/ts/types/dynamics.types'

const melodyStore = useMelodyStore()

export const usePlayerStore = defineStore('player', {
  state: () => ({
    isPlaying: false,
    loop: true,
    selectedInstrument: 0,
    useFixedVelocity: false,
    fixedVelocity: 100,
    useDynamics: true,
    selectedDynamic: dynamics[4] as Dynamic,
    bpm: 120
  }),

  actions: {
    setIsPlaying(playing: boolean) {
      this.isPlaying = playing
    },
    setLoop(loop: boolean) {
      this.loop = loop

      const player = document.getElementById('player')
      if (player?.hasAttribute('loop')) {
        player?.removeAttribute('loop')
      } else {
        player?.setAttribute('loop', 'true')
      }
    },
    setSelectedInstrument(instrument: number) {
      this.selectedInstrument = instrument
    },
    setUseFixedVelocity(use: boolean) {
      this.useFixedVelocity = use

      if (use) {
        this.useDynamics = false
      }
      melodyStore.generateMidiFile()
    },
    setFixedVelocity(velocity: number) {
      this.fixedVelocity = velocity

      if (this.useDynamics) {
        this.useDynamics = false
      }
      melodyStore.generateMidiFile()
    },
    setUseDynamics(use: boolean) {
      this.useDynamics = use

      if (use) {
        this.useFixedVelocity = false
      }

      melodyStore.generateMidiFile()
    },
    setSelectedDynamic(dynamic: Dynamic) {
      this.selectedDynamic = dynamic
      melodyStore.generateMidiFile()
    },
    setBpm(bpm: number) {
      this.bpm = bpm
      melodyStore.generateMidiFile()
    }
  }
})
