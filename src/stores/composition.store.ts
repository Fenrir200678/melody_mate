import { defineStore } from 'pinia'
import { useMelodyStore } from './melody.store'

export const useCompositionStore = defineStore('composition', {
  state: () => ({
    scaleName: 'minor',
    key: 'A',
    bars: 4,
    lastBars: 4,
    minOctave: 3,
    maxOctave: 4
  }),

  actions: {
    setScaleName(name: string) {
      this.scaleName = name
    },
    setKey(key: string) {
      this.key = key
    },
    setBars(bars: number) {
      this.lastBars = this.bars
      this.bars = bars
    },
    setMinOctave(octave: number) {
      this.minOctave = octave
      useMelodyStore().generateMidiFile()
    },
    setMaxOctave(octave: number) {
      this.maxOctave = octave
      useMelodyStore().generateMidiFile()
    }
  }
})
