import { defineStore } from 'pinia'
import type { RhythmPattern, Melody, AIConfig } from '@/models'
import { generateScale } from '@/services/ScaleService'
import type { InstrumentKey } from '@/services/AudioService'

// Services are dynamically imported in actions to enable code splitting.
// This is especially useful for the AI service, which can be large.

export const useMusicStore = defineStore('music', {
  state: () => ({
    scaleName: 'Minor Scale' as string,
    key: 'C' as string,
    rhythm: null as RhythmPattern | null,
    bars: 2,
    bpm: 120,
    useMotifRepetition: true,
    useNGrams: false,
    useAI: false,
    aiConfig: {
      model: 'melody_rnn',
      steps: 32,
      temperature: 1.0
    } as AIConfig,
    melody: null as Melody | null,
    isGenerating: false,
    isPlaying: false,
    selectedInstrument: 'default' as InstrumentKey
  }),

  actions: {
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
    setUseAI(useAI: boolean) {
      this.useAI = useAI
    },
    setAiConfig(config: Partial<AIConfig>) {
      this.aiConfig = { ...this.aiConfig, ...config }
    },

    setInstrument(instrument: InstrumentKey) {
      this.selectedInstrument = instrument
    },

    async generate() {
      const scale = generateScale(this.scaleName, this.key)
      if (!scale || !this.rhythm) {
        console.error('Scale and rhythm must be selected before generating.')
        return
      }

      this.isGenerating = true
      this.melody = null

      try {
        if (this.useAI) {
          // AI generation logic will be added later.
          console.log('AI generation is not yet implemented.')
        } else {
          const { generateMelody } = await import('@/services/MelodyService')
          this.melody = generateMelody(scale, this.rhythm, this.bars, this.useMotifRepetition, this.useNGrams)
        }
      } catch (error) {
        console.error('Error during melody generation:', error)
      } finally {
        this.isGenerating = false
      }
    },

    async playMelody() {
      if (!this.melody || this.isPlaying) return

      this.isPlaying = true
      const { playMelody } = await import('@/services/AudioService')
      await playMelody(this.melody, this.bpm, this.selectedInstrument, () => {
        this.isPlaying = false
      })
    },

    async stopMelody() {
      if (!this.isPlaying) return
      const { stopPlayback } = await import('@/services/AudioService')
      stopPlayback()
      this.isPlaying = false
    },

    async exportMidi() {
      if (!this.melody) return
      const { saveAsMidi } = await import('@/services/MidiService')
      const key = this.key.replace(/\s+/g, '_').toLowerCase()
      const scale = this.scaleName.replace(/\s+/g, '_').toLowerCase().replace('scale', '')
      const bars = this.bars
      const barString = bars > 1 ? `-${bars}bars` : ''
      const fileName = `${key}-${scale}${barString}.mid`
      console.log(fileName)
      saveAsMidi(this.melody, this.bpm, fileName)
    }
  }
})

export default useMusicStore
