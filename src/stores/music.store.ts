import { defineStore } from 'pinia'
import type { Melody, RhythmPattern } from '@/ts/models'
import { generateScale } from '@/services/ScaleService'
import type { InstrumentKey } from '@/ts/types/audio.types'
import type { MelodyGenerationOptions } from '@/services/melody/melody.types'
import { setMelodyOctave } from '@/utils/transpose'

export const useMusicStore = defineStore('music', {
  state: () => ({
    scaleName: 'minor',
    key: 'C',
    rhythm: null as RhythmPattern | null,
    bars: 4,
    lastBars: 4,
    bpm: 120,
    useMotifRepetition: true,
    useNGrams: false,
    useAI: false,
    melody: null as Melody | null,
    isGenerating: false,
    isPlaying: false,
    selectedInstrument: 'default' as InstrumentKey,
    currentStep: -1,
    activeNoteStep: -1,
    octave: 3,
    useFixedVelocity: true,
    fixedVelocity: 127,
    startWithRootNote: false,
    loopPlayback: 1,
    euclideanRotation: 0,
    restProbability: 0.15,
    useMotifTrainingData: true,
    nGramLength: 2
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
    setRhythm(rhythm: RhythmPattern) {
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
    async generate() {
      const scale = generateScale(this.scaleName, this.key)
      if (!scale || !this.rhythm) {
        return
      }

      this.isGenerating = true
      this.melody = null

      try {
        const { generateMelody } = await import('@/services/melody')
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
        this.isGenerating = false
      }
    },

    setCurrentStep(step: number) {
      this.currentStep = step
    },

    setActiveNoteStep(step: number) {
      this.activeNoteStep = step
    },

    async playMelody() {
      if (!this.melody || this.isPlaying) return

      this.isPlaying = true
      const { playMelody, setStepUpdateCallback, setNotePlayCallback } = await import('@/services/AudioService')

      // Set up continuous step update callback for base animation
      setStepUpdateCallback((step: number) => {
        this.setCurrentStep(step)
      })

      // Set up note play callback for pulse highlights
      setNotePlayCallback((step: number) => {
        this.setActiveNoteStep(step)
        // Reset the note highlight after a short duration
        setTimeout(() => {
          this.setActiveNoteStep(-1)
        }, 150) // 150ms highlight duration
      })

      // Get the rhythm pattern for animation sync
      const rhythmPattern = this.rhythm?.pattern

      await playMelody(this.melody, this.bpm, this.selectedInstrument, rhythmPattern, this.loopPlayback, () => {
        this.isPlaying = false
        this.setCurrentStep(-1) // Reset animation
        this.setActiveNoteStep(-1) // Reset note highlights
      })
    },

    async stopMelody() {
      if (!this.isPlaying) return
      try {
        const { stopPlayback, clearStepUpdateCallback, clearNotePlayCallback } = await import('@/services/AudioService')
        clearStepUpdateCallback()
        clearNotePlayCallback()
        stopPlayback()
        this.isPlaying = false
        this.setCurrentStep(-1)
        this.setActiveNoteStep(-1)
      } catch (error) {
        console.error('Error stopping melody:', error)
      }
    },

    async exportMidi() {
      if (!this.melody) return
      const { saveAsMidi } = await import('@/services/MidiService')
      const key = this.key.replace(/\s+/g, '_').toLowerCase()
      const scale = this.scaleName.replace(/\s+/g, '_').toLowerCase().replace('scale', '')
      const bars = this.bars
      const barString = bars > 1 ? `-${bars}_bars` : ''
      const fileName = `${key}-${scale}${barString}.mid`
      console.log(fileName)
      saveAsMidi(this.melody, this.bpm, fileName)
    }
  },
  getters: {}
})

export default useMusicStore
