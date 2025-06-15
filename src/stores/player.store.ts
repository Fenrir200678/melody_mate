import { defineStore } from 'pinia'
import { useMelodyStore } from './melody.store'

const melodyStore = useMelodyStore()

export const usePlayerStore = defineStore('player', {
  state: () => ({
    isPlaying: false,
    loopPlayback: 1,
    selectedInstrument: 0,
    useFixedVelocity: false,
    fixedVelocity: 100,
    bpm: 120
  }),

  actions: {
    setIsPlaying(playing: boolean) {
      this.isPlaying = playing
    },
    setLoopPlayback(count: number) {
      this.loopPlayback = count
    },
    setSelectedInstrument(instrument: number) {
      this.selectedInstrument = instrument
    },
    setUseFixedVelocity(use: boolean) {
      this.useFixedVelocity = use
      melodyStore.generateMidiFile()
    },
    setFixedVelocity(velocity: number) {
      this.fixedVelocity = velocity
      melodyStore.generateMidiFile()
    },
    setBpm(bpm: number) {
      this.bpm = bpm
      melodyStore.generateMidiFile()
    }
  }
})
