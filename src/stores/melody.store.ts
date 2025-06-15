import { defineStore } from 'pinia'
import type { Melody } from '@/ts/models'
import { useCompositionStore } from './composition.store'
import { useRhythmStore } from './rhythm.store'

export const useMelodyStore = defineStore('melody', {
  state: () => ({
    melody: null as Melody | null,
    isGenerating: false,
    midiUrl: '',
    track: null
  }),

  actions: {
    setMelody(melody: Melody | null) {
      this.melody = melody
    },

    async generateMelody() {
      const rhythm = useRhythmStore()

      if (!rhythm.rhythm) return

      this.isGenerating = true
      this.melody = null

      try {
        const [{ generateScale }, { generateMelody }] = await Promise.all([
          import('@/services/ScaleService'),
          import('@/services/melody')
        ])

        const scale = generateScale()
        if (!scale) return

        this.melody = generateMelody()
      } catch (error) {
        console.error('Error during melody generation:', error)
      } finally {
        this.generateMidiFile()
        this.isGenerating = false
      }
    },

    async generateMidiFile() {
      if (!this.melody) return

      const [MidiWriter, { generateMidiFile }] = await Promise.all([
        import('midi-writer-js'),
        import('@/services/MidiService')
      ])

      // @ts-expect-error - track is not typed
      this.track = new MidiWriter.default.Track()
      const dataUri = generateMidiFile(this.melody, this.track)
      this.midiUrl = dataUri
    },

    async downloadMidiFile() {
      if (!this.melody) return
      const { downloadMidiFile } = await import('@/services/MidiService')
      const fileName = this.getFileName()
      downloadMidiFile(this.midiUrl, fileName, this.track)
    },

    getFileName() {
      const composition = useCompositionStore()
      const key = composition.key.replace(/\s+/g, '_').toLowerCase()
      const scale = composition.scaleName.replace(/\s+/g, '_').toLowerCase().replace('scale', '')
      const bars = composition.bars
      const barString = bars > 1 ? `-${bars}_bars` : ''
      return `${key}-${scale}${barString}.mid`
    }
  }
})
