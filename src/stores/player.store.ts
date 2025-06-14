import { defineStore } from 'pinia'

export const usePlayerStore = defineStore('player', {
  state: () => ({
    isPlaying: false,
    loopPlayback: 1,
    selectedInstrument: 2,
    useFixedVelocity: true,
    fixedVelocity: 100,
    bpm: 120,
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
    },
    setFixedVelocity(velocity: number) {
      this.fixedVelocity = velocity
    },
    setBpm(bpm: number) {
      this.bpm = bpm
    },
  }
})