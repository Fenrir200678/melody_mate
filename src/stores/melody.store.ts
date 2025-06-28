import { defineStore } from 'pinia'
import type { Melody } from '@/ts/models'
import type { AnyRhythm } from '@/ts/types/rhythm.types'

/**
 * Pure State Management Store for Melody
 * Business Logic is handled in useMelodyGeneration composable
 */
export const useMelodyStore = defineStore('melody', {
  state: () => ({
    melody: null as Melody | null,
    isGenerating: false,
    midiUrl: '',
    track: null as any, // MIDI track object from midi-writer-js (not properly typed)
    lastUsedRhythm: null as AnyRhythm | null // The rhythm that was used to generate the current melody
  }),

  actions: {
    /**
     * Set the current melody
     */
    setMelody(melody: Melody | null) {
      this.melody = melody
    },

    /**
     * Set the generating state
     */
    setIsGenerating(generating: boolean) {
      this.isGenerating = generating
    },

    /**
     * Set the MIDI URL for download
     */
    setMidiUrl(url: string) {
      this.midiUrl = url
    },

    /**
     * Set the MIDI track object
     */
    setTrack(track: any) {
      this.track = track
    },

    /**
     * Set the rhythm that was used to generate the current melody
     */
    setLastUsedRhythm(rhythm: AnyRhythm | null) {
      this.lastUsedRhythm = rhythm
    }
  }
})
