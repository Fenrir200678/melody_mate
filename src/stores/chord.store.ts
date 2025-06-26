import { defineStore } from 'pinia';
import type { Chord } from '@/ts/models/Chord';

export const useChordStore = defineStore('chord', {
  state: () => ({
    progression: 'I-V-vi-IV',
    chords: [] as Chord[],
    useChords: false,
  }),

  actions: {
    setProgression(progression: string) {
      this.progression = progression;
    },
    setChords(chords: Chord[]) {
      this.chords = chords;
    },
    setUseChords(use: boolean) {
      this.useChords = use;
    },
  },
});
