import { RHYTHMIC_LICKS } from '@/data/rhythmic-licks'
import { choose } from '@/utils/random-chooser'
import type { UnifiedRhythm, RhythmEvent } from '@/ts/types/rhythm.types'

/**
 * Converts a UnifiedRhythm into a binary step array.
 * @param lick - The UnifiedRhythm object.
 * @returns A binary array representing the lick.
 */
function convertLickToSteps(lick: UnifiedRhythm): (0 | 1)[] {
  const pattern: (0 | 1)[] = new Array(lick.totalSteps).fill(0)
  for (const event of lick.events) {
    if (!event.isRest) {
      pattern[event.step] = 1
      // Alle weiteren Schritte der Dauer bleiben 0 (nur onset als 1)
    }
  }
  return pattern
}

/**
 * Injects rhythmic licks into a UnifiedRhythm as additional events.
 * Licks are added to the rhythm without replacing original events.
 * @param unifiedRhythm - The original UnifiedRhythm.
 * @param frequency - The probability (0 to 1) of a lick being injected at each event.
 * @returns The modified UnifiedRhythm with additional lick events.
 */
export function injectRhythmicLicksIntoUnifiedRhythm(unifiedRhythm: UnifiedRhythm, frequency: number): UnifiedRhythm {
  if (frequency === 0 || RHYTHMIC_LICKS.length === 0 || unifiedRhythm.events.length === 0) {
    return unifiedRhythm
  }

  const allEvents: RhythmEvent[] = [...unifiedRhythm.events] // Start with original events

  // Try to inject licks at each original note event
  for (const originalEvent of unifiedRhythm.events) {
    // Skip rest events
    if (originalEvent.isRest) {
      continue
    }

    // Try to inject a lick at this position
    if (Math.random() < frequency) {
      const randomLick = choose(RHYTHMIC_LICKS)

      // Check if the lick fits without exceeding totalSteps
      const lickEndStep = originalEvent.step + randomLick.totalSteps
      if (lickEndStep <= unifiedRhythm.totalSteps) {
        // Add the lick's events relative to the current step (ADDITIVE, not replacing)
        for (const lickEvent of randomLick.events) {
          if (!lickEvent.isRest) {
            allEvents.push({
              step: originalEvent.step + lickEvent.step,
              durationInSteps: lickEvent.durationInSteps,
              isRest: false
            })
          }
        }
      }
    }
  }

  // Remove duplicate events (same step) and sort by step
  const uniqueEvents = allEvents
    .filter((event, index, arr) => arr.findIndex((e) => e.step === event.step) === index)
    .sort((a, b) => a.step - b.step)

  return {
    ...unifiedRhythm,
    events: uniqueEvents
  }
}

/**
 * Injects rhythmic licks into the main noteSteps array.
 * @param noteSteps - The original array of note positions.
 * @param totalSteps - The total number of steps for the melody.
 * @param frequency - The probability (0 to 1) of a lick being injected.
 * @returns The modified noteSteps array with licks.
 * @deprecated Use injectRhythmicLicksIntoUnifiedRhythm for new UnifiedRhythm system
 */
export function injectRhythmicLicks(noteSteps: number[], totalSteps: number, frequency: number): number[] {
  if (frequency === 0 || RHYTHMIC_LICKS.length === 0) {
    return noteSteps
  }

  const newNoteSteps: number[] = []
  let i = 0

  while (i < noteSteps.length) {
    const currentStep = noteSteps[i]

    if (Math.random() < frequency) {
      const randomLick = choose(RHYTHMIC_LICKS)
      const lickStepPattern = convertLickToSteps(randomLick)
      const lickLength = lickStepPattern.length

      // Check if the lick fits without exceeding totalSteps
      if (currentStep + lickLength <= totalSteps) {
        // Add the lick's note positions relative to the current step
        for (let j = 0; j < lickLength; j++) {
          if (lickStepPattern[j] === 1) {
            newNoteSteps.push(currentStep + j)
          }
        }

        // Find the next step in the original array that is *after* the lick ends
        let nextOriginalStepIndex = i
        while (
          nextOriginalStepIndex < noteSteps.length &&
          noteSteps[nextOriginalStepIndex] < currentStep + lickLength
        ) {
          nextOriginalStepIndex++
        }
        i = nextOriginalStepIndex
        continue // Continue to the next iteration of the while loop
      }
    }

    // If no lick was injected, just add the original step
    newNoteSteps.push(currentStep)
    i++
  }

  // Remove duplicate steps that might have been created
  return [...new Set(newNoteSteps)].sort((a, b) => a - b)
}
