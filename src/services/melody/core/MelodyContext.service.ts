import type { MelodyGenerationContext } from '../melody.types'
import { getStepsPerBar } from '../duration.service'
import { createTrainingData } from '../training-data.service'
import { buildMarkovTable } from '@/utils/markov'
import { generateScale } from '../../ScaleService'
import { useCompositionStore } from '@/stores/composition.store'
import { useGenerationStore } from '@/stores/generation.store'
import { useRhythmStore } from '@/stores/rhythm.store'
import type { UnifiedRhythm } from '@/ts/types/rhythm.types'
import {
  convertCustomSequencerToUnifiedRhythm,
  convertEuclideanToUnifiedRhythm,
  convertPresetToUnifiedRhythm
} from '@/utils/rhythm-converter'
import { isEuclideanRhythm } from '@/ts/types/rhythm.types'

/**
 * Service responsible for preparing melody generation context from store state
 */
export class MelodyContextService {
  /**
   * Prepares the generation context object from the current store state.
   * @returns The fully populated melody generation context, or null if essential data is missing.
   */
  prepareGenerationContext(): MelodyGenerationContext | null {
    const compositionStore = useCompositionStore()
    const generationStore = useGenerationStore()
    const rhythmStore = useRhythmStore()

    const { bars = 4, minOctave = 4, maxOctave = 5 } = compositionStore
    const {
      useNGrams = false,
      nGramLength = 1,
      useMotifTrainingData = false,
      motifRepetitionPattern = 'AABB',
      useRandomMotifPattern = false
    } = generationStore
    const { rhythm, useCustomRhythm, customRhythmSequence } = rhythmStore

    if (!rhythm && !useCustomRhythm) return null

    const scale = generateScale()
    if (!scale) return null

    let unifiedRhythm: UnifiedRhythm

    if (useCustomRhythm) {
      unifiedRhythm = convertCustomSequencerToUnifiedRhythm(customRhythmSequence)
    } else if (rhythm && isEuclideanRhythm(rhythm)) {
      unifiedRhythm = convertEuclideanToUnifiedRhythm(rhythm)
    } else if (rhythm) {
      unifiedRhythm = convertPresetToUnifiedRhythm(rhythm)
    } else {
      return null
    }

    const trainingData = createTrainingData(scale, useMotifTrainingData)
    const markovN = useNGrams ? (nGramLength ?? 1) : 1
    const markovTable = buildMarkovTable(trainingData, markovN)

    const subdivision = unifiedRhythm.subdivision
    const stepsPerBar = getStepsPerBar(subdivision)
    const totalSteps = bars * stepsPerBar

    return {
      scale,
      markovTable,
      totalSteps,
      stepsPerBar,
      unifiedRhythm,
      minOctave,
      maxOctave,
      subdivision,
      n: markovN,
      motifRepetitionPattern: motifRepetitionPattern ?? 'AABB',
      useRandomMotifPattern: useRandomMotifPattern ?? false
    }
  }
}
