import { computed, inject } from 'vue'
import type { RhythmCategory, SequencerStep } from '@/ts/types/rhythm.types'
import type { WeightedRhythmSelector } from '@/services/rhythm/generators/WeightedRhythmSelector.service'
import type { RhythmPatternProcessor } from '@/services/rhythm/processors/RhythmPatternProcessor.service'
import { useRhythmStore } from '@/stores/rhythm.store'
import { SEQUENCER_STEPS_PER_BAR } from '@/ts/consts'
import { WEIGHTED_RHYTHMS } from '@/data/weighted_rhythms'

/**
 * Composable for rhythm selection and custom rhythm processing
 * Separates Store State from Service Logic
 */
export function useRhythmSelection() {
  const rhythmStore = useRhythmStore()

  // Inject Services
  const weightedRhythmSelector = inject<WeightedRhythmSelector>('weightedRhythmSelector')
  const rhythmPatternProcessor = inject<RhythmPatternProcessor>('rhythmPatternProcessor')

  if (!weightedRhythmSelector || !rhythmPatternProcessor) {
    throw new Error('Rhythm services not provided. Ensure they are registered in main.ts')
  }

  // Custom rhythm conversion is now handled in MelodyContextService
  // No need for separate conversion here anymore

  /**
   * Set step duration in custom rhythm sequence
   * Extracted Business Logic from setStepDuration action
   */
  const setStepDuration = (index: number, duration: number): void => {
    const stepDuration = 1 / SEQUENCER_STEPS_PER_BAR
    const stepsToOccupy = duration > 0 ? Math.round(duration / stepDuration) : 1

    // Validation logic
    if (duration > 0) {
      if (index + stepsToOccupy > SEQUENCER_STEPS_PER_BAR) {
        console.error('Note duration exceeds bar length.')
        return
      }

      // Update sequence via store
      const newSequence = [...rhythmStore.customRhythmSequence]

      const currentValue = newSequence[index]
      if (currentValue > 0) {
        // This step has a note - clear it and all its occupied steps
        const currentNoteLength = Math.round(currentValue / stepDuration)
        for (let i = 0; i < currentNoteLength; i++) {
          if (index + i < newSequence.length) {
            newSequence[index + i] = 0
          }
        }
      }

      // Now set the new note
      newSequence[index] = duration

      for (let i = 1; i < stepsToOccupy; i++) {
        newSequence[index + i] = -1
      }

      rhythmStore.setCustomRhythmSequence(newSequence)
    } else {
      // Set to rest and free all occupied steps by this note
      const newSequence = [...rhythmStore.customRhythmSequence]
      const currentValue = newSequence[index]
      if (currentValue > 0) {
        // Note start: finde Länge und räume alle belegten Steps frei
        const noteLength = Math.round(currentValue / stepDuration)
        for (let i = 0; i < noteLength; i++) {
          if (index + i < newSequence.length && (newSequence[index + i] === -1 || i === 0)) {
            newSequence[index + i] = 0
          }
        }
      } else {
        // Falls auf einen einzelnen belegten Step (-1) geklickt wird, einfach auf 0 setzen
        newSequence[index] = 0
      }
      rhythmStore.setCustomRhythmSequence(newSequence)
    }
  }

  /**
   * Clear custom rhythm sequence
   */
  const clearCustomRhythm = (): void => {
    const emptySequence = Array(SEQUENCER_STEPS_PER_BAR).fill(0) as SequencerStep[]
    rhythmStore.setCustomRhythmSequence(emptySequence)
  }

  /**
   * Set default rhythm for a category
   * Extracted Business Logic from setDefaultRhythm action
   */
  const setDefaultRhythm = (category: RhythmCategory): void => {
    const firstRhythm = WEIGHTED_RHYTHMS.find((r) => r.category === category) || null
    if (firstRhythm) {
      rhythmStore.setRhythm(firstRhythm)
    }
  }

  /**
   * Set rhythm category and auto-select default rhythm
   */
  const setRhythmCategory = (category: RhythmCategory): void => {
    rhythmStore.setRhythmCategory(category)
    setDefaultRhythm(category)
  }

  /**
   * Toggle random rhythm and set initial rhythm
   */
  const setUseRandomRhythm = (use: boolean): void => {
    rhythmStore.setUseRandomRhythm(use)

    if (use) {
      const firstRhythm = WEIGHTED_RHYTHMS.find((r) => r.category === rhythmStore.rhythmCategory) || null
      if (firstRhythm) {
        rhythmStore.setRhythm(firstRhythm)
      }
    }
  }

  /**
   * Toggle custom rhythm mode
   */
  const toggleCustomRhythm = (enable: boolean): void => {
    rhythmStore.toggleCustomRhythm(enable)
  }

  // Reactive computed properties
  const rhythm = computed(() => rhythmStore.rhythm)
  const rhythmCategory = computed(() => rhythmStore.rhythmCategory)
  const useRandomRhythm = computed(() => rhythmStore.useRandomRhythm)
  const euclideanRotation = computed(() => rhythmStore.euclideanRotation)
  const customRhythmSequence = computed(() => rhythmStore.customRhythmSequence)
  const useCustomRhythm = computed(() => rhythmStore.useCustomRhythm)

  return {
    // State
    rhythm,
    rhythmCategory,
    useRandomRhythm,
    euclideanRotation,
    customRhythmSequence,
    useCustomRhythm,

    // Actions
    setStepDuration,
    clearCustomRhythm,
    setDefaultRhythm,
    setRhythmCategory,
    setUseRandomRhythm,
    toggleCustomRhythm,

    // Store actions (direct pass-through)
    setRhythm: rhythmStore.setRhythm,
    setEuclideanRotation: rhythmStore.setEuclideanRotation
  }
}
