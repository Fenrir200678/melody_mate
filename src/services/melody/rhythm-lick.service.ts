import { RHYTHMIC_LICKS } from '@/data/rhythmic-licks';
import { STEPS_PER_16N } from '@/ts/consts'; // Assuming a base subdivision for licks
import { choose } from '@/utils/random-chooser';

/**
 * Converts a lick pattern (e.g., ['8n', '16n']) into a binary step array.
 * @param lickSteps - The array of duration strings.
 * @returns A binary array representing the lick.
 */
function convertLickToSteps(lickSteps: string[]): (0 | 1)[] {
  const pattern: (0 | 1)[] = [];
  for (const duration of lickSteps) {
    // Note: This assumes a context (e.g., 16n) for converting durations.
    // A more robust implementation might need a dynamic stepsMap.
    const stepsForNote = STEPS_PER_16N[duration as keyof typeof STEPS_PER_16N] || 0;
    if (stepsForNote > 0) {
      pattern.push(1);
      if (stepsForNote > 1) {
        pattern.push(...new Array(stepsForNote - 1).fill(0));
      }
    }
  }
  return pattern;
}

/**
 * Injects rhythmic licks into the main noteSteps array.
 * @param noteSteps - The original array of note positions.
 * @param totalSteps - The total number of steps for the melody.
 * @param frequency - The probability (0 to 1) of a lick being injected.
 * @returns The modified noteSteps array with licks.
 */
export function injectRhythmicLicks(
  noteSteps: number[],
  totalSteps: number,
  frequency: number
): number[] {
  if (frequency === 0 || RHYTHMIC_LICKS.length === 0) {
    return noteSteps;
  }

  const newNoteSteps: number[] = [];
  let i = 0;

  while (i < noteSteps.length) {
    const currentStep = noteSteps[i];

    if (Math.random() < frequency) {
      const randomLick = choose(RHYTHMIC_LICKS);
      const lickStepPattern = convertLickToSteps(randomLick.steps);
      const lickLength = lickStepPattern.length;

      // Check if the lick fits without exceeding totalSteps
      if (currentStep + lickLength <= totalSteps) {
        // Add the lick's note positions relative to the current step
        for (let j = 0; j < lickLength; j++) {
          if (lickStepPattern[j] === 1) {
            newNoteSteps.push(currentStep + j);
          }
        }

        // Find the next step in the original array that is *after* the lick ends
        let nextOriginalStepIndex = i;
        while (
          nextOriginalStepIndex < noteSteps.length &&
          noteSteps[nextOriginalStepIndex] < currentStep + lickLength
        ) {
          nextOriginalStepIndex++;
        }
        i = nextOriginalStepIndex;
        continue; // Continue to the next iteration of the while loop
      }
    }

    // If no lick was injected, just add the original step
    newNoteSteps.push(currentStep);
    i++;
  }

  // Remove duplicate steps that might have been created
  return [...new Set(newNoteSteps)].sort((a, b) => a - b);
}
