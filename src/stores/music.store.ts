import { defineStore } from 'pinia'
import type { Melody } from '@/ts/models'
import type { MelodyGenerationOptions } from '@/services/melody/melody.types'
import { setMelodyOctave } from '@/utils/transpose'
import type { AnyRhythm } from '@/ts/types/rhythm.types'

export const useMusicStore = defineStore('music', {
  state: () => ({
    scaleName: 'minor',
    key: 'C',
    rhythm: null as AnyRhythm | null,
    bars: 4,
    lastBars: 4,
    bpm: 120,
    useMotifRepetition: true,
    useNGrams: false,
    melody: null as Melody | null,
    isGenerating: false,
    isPlaying: false,
    selectedInstrument: 2,
    octave: 3,
    useFixedVelocity: true,
    fixedVelocity: 100,
    startWithRootNote: false,
    loopPlayback: 1,
    euclideanRotation: 0,
    restProbability: 0.1,
    useMotifTrainingData: false,
    nGramLength: 2,
    midiUrl: '',
    track: null
  }),

  actions: {
    setLoopPlayback(count: number) {
      this.loopPlayback = count
    },
    setScaleName(name: string) {
      this.scaleName = name
    },
    setKey(key: string) {
      this.key = key
    },
    setRhythm(rhythm: AnyRhythm | null) {
      this.rhythm = rhythm
    },
    setBars(bars: number) {
      this.lastBars = this.bars
      this.bars = bars
    },
    setBpm(bpm: number) {
      this.bpm = bpm
    },
    setUseMotifRepetition(use: boolean) {
      this.useMotifRepetition = use
    },
    setUseNGrams(use: boolean) {
      this.useNGrams = use
    },
    setOctave(octave: number) {
      if (this.melody && this.melody.notes.length) {
        this.melody = {
          ...this.melody,
          notes: setMelodyOctave(this.melody.notes, octave)
        }
      }
      this.octave = octave
    },
    setUseFixedVelocity(use: boolean) {
      this.useFixedVelocity = use
    },
    setFixedVelocity(velocity: number) {
      this.fixedVelocity = velocity
    },
    setStartWithRootNote(startWithRootNote: boolean) {
      this.startWithRootNote = startWithRootNote
    },
    setEuclideanRotation(rotation: number) {
      this.euclideanRotation = rotation
    },
    setRestProbability(prob: number) {
      this.restProbability = prob
    },
    setUseMotifTrainingData(use: boolean) {
      this.useMotifTrainingData = use
    },
    setNGramLength(n: number) {
      this.nGramLength = n
    },
    setMidiUrl(url: string) {
      this.midiUrl = url
    },
    setSelectedInstrument(instrument: number) {
      this.selectedInstrument = instrument
    },

    async generateMelody() {
      if (!this.rhythm) return

      this.isGenerating = true
      this.melody = null

      try {
        // Dynamically import services
        const [{ generateScale }, { generateMelody }] = await Promise.all([
          import('@/services/ScaleService'),
          import('@/services/melody')
        ])

        const scale = generateScale(this.scaleName, this.key)
        if (!scale) return

        const melodyOptions: MelodyGenerationOptions = {
          scale,
          rhythm: this.rhythm,
          bars: this.bars,
          octave: this.octave,
          useMotifRepetition: this.useMotifRepetition,
          useNGrams: this.useNGrams,
          useFixedVelocity: this.useFixedVelocity,
          fixedVelocity: this.fixedVelocity,
          startWithRootNote: this.startWithRootNote,
          restProbability: this.restProbability,
          useMotifTrainingData: this.useMotifTrainingData,
          n: this.useNGrams ? this.nGramLength : 1
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

      // Dynamically import MidiWriter and MidiService
      const [MidiWriter, { generateMidiFile }] = await Promise.all([
        import('midi-writer-js'),
        import('@/services/MidiService')
      ])

      // @ts-expect-error - track is not typed
      this.track = new MidiWriter.default.Track()
      const dataUri = generateMidiFile(this.melody, this.bpm, this.selectedInstrument, this.track)
      this.setMidiUrl(dataUri)
    },

    async downloadMidiFile() {
      if (!this.melody) return
      const { downloadMidiFile } = await import('@/services/MidiService')
      const fileName = this.getFileName()
      downloadMidiFile(this.midiUrl, fileName, this.track)
    },

    getFileName() {
      const key = this.key.replace(/\s+/g, '_').toLowerCase()
      const scale = this.scaleName.replace(/\s+/g, '_').toLowerCase().replace('scale', '')
      const bars = this.bars
      const barString = bars > 1 ? `-${bars}_bars` : ''
      return `${key}-${scale}${barString}.mid`
    }
  },
  getters: {}
})

export default useMusicStore
