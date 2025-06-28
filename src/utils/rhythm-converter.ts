import type {
  RhythmEvent,
  SequencerStep,
  UnifiedRhythm,
  WeightedRhythm,
  EuclideanRhythm
} from '@/ts/types/rhythm.types'

const NOTATION_TO_TICKS: Record<string, number> = {
  '1n': 512,
  '2n.': 384,
  '2n': 256,
  '4n.': 192,
  '4n': 128,
  '8n.': 96,
  '8n': 64,
  '16n.': 48,
  '16n': 32,
  '32n': 16,
  '64n': 8
}

const SUBDIVISION_TO_STEPS_PER_BAR: Record<string, number> = {
  '4n': 4,
  '8n': 8,
  '16n': 16
}

const TICKS_PER_QUARTER_NOTE = 128

function getTicksPerStep(subdivision: '4n' | '8n' | '16n'): number {
  const stepsPerBar = SUBDIVISION_TO_STEPS_PER_BAR[subdivision]
  const totalTicksPerBar = TICKS_PER_QUARTER_NOTE * 4 // Assuming 4/4 time signature
  return totalTicksPerBar / stepsPerBar
}

/**
 * Converts a rhythm preset pattern (using notation strings) into the unified rhythm model.
 * @param rhythm - The weighted rhythm preset.
 * @returns A UnifiedRhythm object.
 */
export function convertPresetToUnifiedRhythm(rhythm: WeightedRhythm): UnifiedRhythm {
  const subdivision = rhythm.subdivision
  const totalSteps = SUBDIVISION_TO_STEPS_PER_BAR[subdivision]
  const ticksPerStep = getTicksPerStep(subdivision)
  const events: RhythmEvent[] = []
  let currentStep = 0

  for (const durationNotation of rhythm.steps) {
    if (currentStep >= totalSteps) {
      break // Prevent exceeding one bar
    }

    const ticks = NOTATION_TO_TICKS[durationNotation]
    if (ticks) {
      const durationInSteps = Math.round(ticks / ticksPerStep)
      if (durationInSteps > 0) {
        events.push({
          step: currentStep,
          durationInSteps,
          isRest: false
        })
        currentStep += durationInSteps
      }
    }
  }

  // Fill remaining space with a rest
  if (currentStep < totalSteps) {
    events.push({
      step: currentStep,
      durationInSteps: totalSteps - currentStep,
      isRest: true
    })
  }

  return {
    events,
    totalSteps,
    subdivision
  }
}

/**
 * Converts a Euclidean rhythm pattern (binary array) into the unified rhythm model.
 * Note: This basic version treats each step as having a duration of 1.
 * @param rhythm - The Euclidean rhythm object.
 * @returns A UnifiedRhythm object.
 */
export function convertEuclideanToUnifiedRhythm(rhythm: EuclideanRhythm): UnifiedRhythm {
  const { pattern } = rhythm
  const subdivision = rhythm.subdivision as '4n' | '8n' | '16n'
  const totalSteps = pattern.length
  const events: RhythmEvent[] = []
  let currentStep = 0

  while (currentStep < totalSteps) {
    const isNote = pattern[currentStep] === 1
    const duration = 1
    while (
      currentStep + duration < totalSteps &&
      pattern[currentStep + duration] === (isNote ? 0 : 0) /* Logic to handle held notes might need refinement here */
    ) {
      // For now, we assume euclidean notes are not held. Every step is a new event.
      break
    }

    // Simplified: treat every step as a new event
    events.push({
      step: currentStep,
      durationInSteps: 1,
      isRest: !isNote
    })
    currentStep++
  }

  // Merge consecutive rests
  const mergedEvents: RhythmEvent[] = []
  let i = 0
  while (i < events.length) {
    const currentEvent = events[i]
    if (currentEvent.isRest) {
      let restDuration = currentEvent.durationInSteps
      let j = i + 1
      while (j < events.length && events[j].isRest) {
        restDuration += events[j].durationInSteps
        j++
      }
      mergedEvents.push({ ...currentEvent, durationInSteps: restDuration })
      i = j
    } else {
      mergedEvents.push(currentEvent)
      i++
    }
  }

  return {
    events: mergedEvents,
    totalSteps,
    subdivision
  }
}

/**
 * Converts a custom sequencer pattern (decimal durations) into the unified rhythm model.
 * @param sequence - The array of numbers from the sequencer, where each value is a note's duration in relation to a bar.
 * @param subdivision - The grid resolution.
 * @returns A UnifiedRhythm object.
 */
export function convertCustomSequencerToUnifiedRhythm(
  sequence: SequencerStep[],
  subdivision: '4n' | '8n' | '16n' = '16n'
): UnifiedRhythm {
  const totalSteps = SUBDIVISION_TO_STEPS_PER_BAR[subdivision]
  const ticksPerStep = getTicksPerStep(subdivision)
  const totalTicksPerBar = totalSteps * ticksPerStep

  const events: RhythmEvent[] = []
  let i = 0
  while (i < sequence.length) {
    const durationValue = sequence[i]
    if (durationValue > 0) {
      const noteDurationInTicks = durationValue * totalTicksPerBar
      const durationInSteps = noteDurationInTicks / ticksPerStep
      const stepsToOccupy = Math.round(durationInSteps) || 1

      // Current position in steps
      const currentStep = i

      if (currentStep < totalSteps) {
        events.push({
          step: currentStep,
          durationInSteps: durationInSteps,
          isRest: false
        })
      }
      i += stepsToOccupy
    } else {
      // It's a rest (0) or an occupied step (-1), just advance
      i++
    }
  }

  // Post-process to fill gaps with rests and clamp durations
  const finalEvents: RhythmEvent[] = []
  let stepTracker = 0

  for (const event of events) {
    // Ensure we don't process events starting beyond the bar
    if (event.step >= totalSteps) continue

    // Add a rest if there's a gap
    if (event.step > stepTracker) {
      finalEvents.push({
        step: stepTracker,
        durationInSteps: event.step - stepTracker,
        isRest: true
      })
    }

    // Clamp the duration of the current event to not exceed the bar length
    const remainingSteps = totalSteps - event.step
    const clampedDuration = Math.min(event.durationInSteps, remainingSteps)

    if (clampedDuration > 0) {
      finalEvents.push({ ...event, durationInSteps: clampedDuration })
      stepTracker = event.step + clampedDuration
    }
  }

  // Add a final rest if the bar is not completely filled
  if (stepTracker < totalSteps) {
    finalEvents.push({
      step: stepTracker,
      durationInSteps: totalSteps - stepTracker,
      isRest: true
    })
  }

  return {
    events: finalEvents,
    totalSteps,
    subdivision
  }
}

/**
 * Extends a single-bar UnifiedRhythm to multiple bars by repeating the pattern.
 * @param singleBarRhythm - The UnifiedRhythm for one bar.
 * @param totalBars - The number of bars to extend to.
 * @returns A UnifiedRhythm covering multiple bars.
 */
export function extendRhythmToMultipleBars(singleBarRhythm: UnifiedRhythm, totalBars: number): UnifiedRhythm {
  if (totalBars <= 1) {
    return singleBarRhythm
  }

  const stepsPerBar = singleBarRhythm.totalSteps
  const allEvents: RhythmEvent[] = []

  for (let bar = 0; bar < totalBars; bar++) {
    const barStartStep = bar * stepsPerBar
    for (const event of singleBarRhythm.events) {
      allEvents.push({
        ...event,
        step: event.step + barStartStep
      })
    }
  }

  return {
    events: allEvents,
    totalSteps: stepsPerBar * totalBars,
    subdivision: singleBarRhythm.subdivision
  }
}
