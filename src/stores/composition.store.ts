import { defineStore } from 'pinia'
import { setMelodyOctave } from '@/utils/transpose'
import { useMelodyStore } from './melody.store'

export const useCompositionStore = defineStore('composition', {
  state: () => ({
    scaleName: 'minor',
    key: 'C',
    bars: 4,
    lastBars: 4,
    octave: 3,
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
    setOctave(octave: number) {
      const melodyStore = useMelodyStore()
      if (melodyStore.melody && melodyStore.melody.notes.length) {
        melodyStore.setMelody({
          ...melodyStore.melody,
          notes: setMelodyOctave(melodyStore.melody.notes, octave)
        })
      }
      this.octave = octave
    },
  }
})