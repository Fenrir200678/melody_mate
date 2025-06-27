import { defineStore } from 'pinia'

export const useGenerationStore = defineStore('generation', {
  state: () => ({
    useMotifRepetition: true,
    motifRepetitionPattern: 'ABAB',
    useRandomMotifPattern: false,
    useNGrams: false,
    nGramLength: 2,
    startWithRootNote: false,
    endWithRootNote: false,
    restProbability: 0,
    useMotifTrainingData: false,
    chordAdherence: 0.75,
    melodicContour: 'arc',
    useRhythmicLicks: false,
    rhythmicLickFrequency: 0.25,
    useCallAndResponse: false
  }),

  actions: {
    setUseCallAndResponse(use: boolean) {
      this.useCallAndResponse = use
    },
    setUseRhythmicLicks(use: boolean) {
      this.useRhythmicLicks = use
    },
    setRhythmicLickFrequency(frequency: number) {
      this.rhythmicLickFrequency = frequency
    },
    setMelodicContour(contour: string) {
      this.melodicContour = contour
    },
    setChordAdherence(adherence: number) {
      this.chordAdherence = adherence
    },
    setUseMotifRepetition(use: boolean) {
      this.useMotifRepetition = use
    },
    setMotifRepetitionPattern(pattern: string) {
      this.motifRepetitionPattern = pattern
    },
    setUseRandomMotifPattern(use: boolean) {
      this.useRandomMotifPattern = use
    },
    setUseNGrams(use: boolean) {
      this.useNGrams = use
    },
    setNGramLength(n: number) {
      this.nGramLength = n
    },
    setStartWithRootNote(startWithRootNote: boolean) {
      this.startWithRootNote = startWithRootNote
    },
    setRestProbability(prob: number) {
      this.restProbability = prob
    },
    setUseMotifTrainingData(use: boolean) {
      this.useMotifTrainingData = use
    },
    setEndWithRootNote(endWithRootNote: boolean) {
      this.endWithRootNote = endWithRootNote
    }
  }
})
