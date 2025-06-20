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
    restProbability: 0.05,
    useMotifTrainingData: false
  }),

  actions: {
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
