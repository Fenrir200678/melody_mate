/**
 * Service for handling duration conversions between steps and MIDI formats.
 */

/**
 * Converts steps to a duration format compatible with midi-writer-js.
 * Uses tick-based durations where T128 = 1 quarter note (beat).
 * @param steps - Number of steps for the duration.
 * @param subdivision - The subdivision (e.g., '16n', '8n', '4n', '32n').
 * @returns Duration in midi-writer-js tick format (e.g., 'T64').
 */
export function convertStepsToDuration(steps: number, subdivision: string): string {
  // MIDI-Writer-JS uses T128 = 1 quarter note (beat)
  // Tick values per step for different subdivisions
  const ticksPerStep: Record<string, number> = {
    '64n': 8, // 64th note = 8 ticks per step (128/16)
    '32n': 16, // 32nd note = 16 ticks per step (128/8)
    '16n': 32, // 16th note = 32 ticks per step (128/4)
    '8n': 64, // 8th note = 64 ticks per step (128/2)
    '4n': 128 // quarter note = 128 ticks per step
  }

  const ticksForOneStep = ticksPerStep[subdivision]
  if (!ticksForOneStep) {
    console.warn(`Unsupported subdivision: ${subdivision}. Falling back to 16n (32 ticks per step).`)
    return `T${steps * 32}`
  }

  const totalTicks = steps * ticksForOneStep
  return `T${totalTicks}`
}

/**
 * Gets steps per bar based on subdivision.
 * @param subdivision - The subdivision (e.g., '16n', '8n', '4n', '32n').
 * @returns Number of steps per bar.
 */
export function getStepsPerBar(subdivision: string): number {
  const subdivisionToStepsPerBar: Record<string, number> = {
    '32n': 32,
    '16n': 16,
    '8n': 8,
    '4n': 4
  }
  return subdivisionToStepsPerBar[subdivision] || 16
}
