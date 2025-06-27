import { defineStore } from 'pinia';
import type { Chord } from '@/ts/models/Chord';
import { generateChordProgression } from '@/services/ChordService';

export const useChordStore = defineStore('chord', {
  state: () => ({
    currentProgression: [] as Chord[],
    chords: [] as Chord[],
    useChords: false,
    selectedProgressionType: 'custom' as 'custom' | 'predefined',
    selectedPredefinedProgressionName: 'I-V-vi-IV',
  }),

  actions: {
    addChordToProgression(chord: Chord) {
      this.currentProgression.push(chord);
    },
    removeChordFromProgression(index: number) {
      this.currentProgression.splice(index, 1);
    },
    reorderProgression(oldIndex: number, newIndex: number) {
      const [removed] = this.currentProgression.splice(oldIndex, 1);
      this.currentProgression.splice(newIndex, 0, removed);
    },
    clearProgression() {
      this.currentProgression = [];
    },
    setChords(chords: Chord[]) {
      this.chords = chords;
    },
    setUseChords(use: boolean) {
      this.useChords = use;
      if (use && this.selectedProgressionType === 'predefined') {
        this.loadPredefinedProgression(this.selectedPredefinedProgressionName);
      }
    },
    setSelectedProgressionType(type: 'custom' | 'predefined') {
      this.selectedProgressionType = type;
      if (type === 'predefined') {
        this.loadPredefinedProgression(this.selectedPredefinedProgressionName);
      }
    },
    setSelectedPredefinedProgressionName(name: string) {
      this.selectedPredefinedProgressionName = name;
      this.loadPredefinedProgression(name);
    },
    loadPredefinedProgression(progressionName: string) {
      // The generateChordProgression function already uses the composition store.
      this.currentProgression = generateChordProgression(progressionName);
    },
  },
});
