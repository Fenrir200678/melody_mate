import { defineStore } from 'pinia'
import type { Melody } from '@/ts/models'
import { useCompositionStore } from './composition.store'
import { useRhythmStore } from './rhythm.store'
import { useChordStore } from './chord.store'
import { WEIGHTED_RHYTHMS } from '@/data/weighted_rhythms'

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
      const rhythmStore = useRhythmStore()
      const chordStore = useChordStore()

      if (!rhythmStore.rhythm) return

      if (rhythmStore.useRandomRhythm) {
        const rhythmsInCategory = WEIGHTED_RHYTHMS.filter((r) => r.category === rhythmStore.rhythmCategory)
        if (rhythmsInCategory.length > 0) {
          const randomRhythm = rhythmsInCategory[Math.floor(Math.random() * rhythmsInCategory.length)]
          rhythmStore.rhythm = randomRhythm
        }
      }

      this.isGenerating = true
      this.melody = null

      try {
        const [{ generateScale }, { generateMelody }, { generateChordProgression }] = await Promise.all([
          import('@/services/ScaleService'),
          import('@/services/MelodyService'),
          import('@/services/ChordService')
        ])

        const scale = generateScale()
        if (!scale) return

        if (chordStore.useChords) {
          if (chordStore.selectedProgressionType === 'predefined') {
            const predefinedChords = generateChordProgression(chordStore.selectedPredefinedProgressionName)
            chordStore.setChords(predefinedChords)
          } else {
            // Custom progression is already in chordStore.currentProgression
            chordStore.setChords(chordStore.currentProgression)
          }
        } else {
          // If chords are not used, clear the chords in the store
          chordStore.setChords([])
        }

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
