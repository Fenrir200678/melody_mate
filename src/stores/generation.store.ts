import { defineStore } from 'pinia'
import { saveState, loadState } from '@/utils/localStorage'

const LOCAL_STORAGE_KEY = 'generationStore'

export const useGenerationStore = defineStore('generation', {
  state: () => ({
    ...loadState(LOCAL_STORAGE_KEY) || {
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
      useCallAndResponse: false,
      // Advanced Musical Rules
      enableIntervalWeighting: true,
      enableScaleDegreeWeighting: true,
      enableChordToneWeighting: true,
      enableMelodicContourWeighting: true,
      enableBeatStrengthWeighting: false,
      enableVoiceLeadingWeighting: false,
      enableRangeWeighting: false
    }
  }),

  actions: {
    setUseCallAndResponse(use: boolean) {
      this.useCallAndResponse = use
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setUseRhythmicLicks(use: boolean) {
      this.useRhythmicLicks = use
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setRhythmicLickFrequency(frequency: number) {
      this.rhythmicLickFrequency = frequency
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setMelodicContour(contour: string) {
      this.melodicContour = contour
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setChordAdherence(adherence: number) {
      this.chordAdherence = adherence
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setUseMotifRepetition(use: boolean) {
      this.useMotifRepetition = use
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setMotifRepetitionPattern(pattern: string) {
      this.motifRepetitionPattern = pattern
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setUseRandomMotifPattern(use: boolean) {
      this.useRandomMotifPattern = use
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setUseNGrams(use: boolean) {
      this.useNGrams = use
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setNGramLength(n: number) {
      this.nGramLength = n
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setStartWithRootNote(startWithRootNote: boolean) {
      this.startWithRootNote = startWithRootNote
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setRestProbability(prob: number) {
      this.restProbability = prob
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setUseMotifTrainingData(use: boolean) {
      this.useMotifTrainingData = use
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setEndWithRootNote(endWithRootNote: boolean) {
      this.endWithRootNote = endWithRootNote
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    // Advanced Musical Rules Actions
    setEnableIntervalWeighting(enable: boolean) {
      this.enableIntervalWeighting = enable
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setEnableScaleDegreeWeighting(enable: boolean) {
      this.enableScaleDegreeWeighting = enable
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setEnableChordToneWeighting(enable: boolean) {
      this.enableChordToneWeighting = enable
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setEnableMelodicContourWeighting(enable: boolean) {
      this.enableMelodicContourWeighting = enable
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setEnableBeatStrengthWeighting(enable: boolean) {
      this.enableBeatStrengthWeighting = enable
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setEnableVoiceLeadingWeighting(enable: boolean) {
      this.enableVoiceLeadingWeighting = enable
      saveState(LOCAL_STORAGE_KEY, this.$state)
    },
    setEnableRangeWeighting(enable: boolean) {
      this.enableRangeWeighting = enable
      saveState(LOCAL_STORAGE_KEY, this.$state)
    }
  }
})
