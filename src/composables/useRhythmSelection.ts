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

    // Clear the area where the new note will be placed or the old note was
    const newSequence = [...rhythmStore.customRhythmSequence]
    const currentValue = newSequence[index]

    if (currentValue > 0) {
      // It's a note start, clear the old note
      const oldNoteDurationInSteps = currentValue / stepDuration
      const oldStepsToOccupy = Math.round(oldNoteDurationInSteps)
      for (let i = 0; i < oldStepsToOccupy; i++) {
        if (index + i < newSequence.length) {
          newSequence[index + i] = 0
        }
      }
    } else if (currentValue === -1) {
      // It's part of a note, we need to find the start and clear it
      let startIndex = index
      while (startIndex > 0 && newSequence[startIndex] === -1) {
        startIndex--
      }
      if (newSequence[startIndex] > 0) {
        const oldNoteDurationInSteps = newSequence[startIndex] / stepDuration
        const oldStepsToOccupy = Math.round(oldNoteDurationInSteps)
        for (let i = 0; i < oldStepsToOccupy; i++) {
          if (startIndex + i < newSequence.length) {
            newSequence[startIndex + i] = 0
          }
        }
      }
    }

    // Now, if a new duration is provided, place the new note
    if (duration > 0) {
      const newStepsToOccupy = Math.round(duration / stepDuration)

      // Check for space
      if (index + newStepsToOccupy > SEQUENCER_STEPS_PER_BAR) {
        console.warn('Note duration exceeds available space.')
        rhythmStore.setCustomRhythmSequence(newSequence) // Commit the clearing part
        return
      }
      for (let i = 1; i < newStepsToOccupy; i++) {
        if (index + i < newSequence.length && newSequence[index + i] > 0) {
          console.warn('Note collides with another note.')
          rhythmStore.setCustomRhythmSequence(newSequence) // Commit the clearing part
          return
        }
      }

      newSequence[index] = duration
      for (let i = 1; i < newStepsToOccupy; i++) {
        if (index + i < newSequence.length) {
          newSequence[index + i] = -1
        }
      }
    }

    rhythmStore.setCustomRhythmSequence(newSequence)
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
