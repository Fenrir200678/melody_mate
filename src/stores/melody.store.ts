import { defineStore } from 'pinia'
import type { Melody } from '@/ts/models'
import type { MelodyGenerationOptions } from '@/services/melody/melody.types'
import { useCompositionStore } from './composition.store'
import { useGenerationStore } from './generation.store'
import { usePlayerStore } from './player.store'
import { useRhythmStore } from './rhythm.store'

export const useMelodyStore = defineStore('melody', {
  state: () => ({
    melody: null as Melody | null,
    isGenerating: false,
    midiUrl: '',
    track: null,
  }),

  actions: {
    setMelody(melody: Melody | null) {
      this.melody = melody
    },
    
    async generateMelody() {
      const composition = useCompositionStore()
      const generation = useGenerationStore()
      const player = usePlayerStore()
      const rhythm = useRhythmStore()

      if (!rhythm.rhythm) return

      this.isGenerating = true
      this.melody = null

      try {
        const [{ generateScale }, { generateMelody }] = await Promise.all([
          import('@/services/ScaleService'),
          import('@/services/melody')
        ])

        const scale = generateScale(composition.scaleName, composition.key)
        if (!scale) return

        const melodyOptions: MelodyGenerationOptions = {
          scale,
          rhythm: rhythm.rhythm,
          bars: composition.bars,
          octave: composition.octave,
          useMotifRepetition: generation.useMotifRepetition,
          motifRepetitionPattern: generation.motifRepetitionPattern,
          useRandomMotifPattern: generation.useRandomMotifPattern,
          useNGrams: generation.useNGrams,
          useFixedVelocity: player.useFixedVelocity,
          fixedVelocity: player.fixedVelocity,
          startWithRootNote: generation.startWithRootNote,
          restProbability: generation.restProbability,
          useMotifTrainingData: generation.useMotifTrainingData,
          n: generation.useNGrams ? generation.nGramLength : 1
        }
        this.melody = generateMelody(melodyOptions)
      } catch (error) {
        console.error('Error during melody generation:', error)
      } finally {
        this.generateMidiFile()
        this.isGenerating = false
      }
    },

    async generateMidiFile() {
      if (!this.melody) return
      const player = usePlayerStore()

      const [MidiWriter, { generateMidiFile }] = await Promise.all([
        import('midi-writer-js'),
        import('@/services/MidiService')
      ])

      // @ts-expect-error - track is not typed
      this.track = new MidiWriter.default.Track()
      const dataUri = generateMidiFile(this.melody, player.bpm, player.selectedInstrument, this.track)
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