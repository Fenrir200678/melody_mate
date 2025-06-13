import type { AppNote } from '@/ts/models'
import { convertStepsToDuration } from './duration.service'
import { getPitchWithOctave } from './pitch-utils.service'
import { getNextPitch } from '@/utils/pitch'
import { calculateVelocity } from '@/utils/velocity'
import type { MelodyGenerationContext, NoteGenerationResult } from './melody.types'

/**
 * Service for generating individual notes based on Markov chains and parameters.
 */

type NoteGenerationState = {
  pitchContext: string[]
  lastActualPitch: string
  consecutiveRests: number
}

function initializeState(context: MelodyGenerationContext, initialPitch?: string): NoteGenerationState {
  const { scale } = context.options
  const startWithRootNote = context.options.startWithRootNote ?? false

  let pitch = initialPitch || scale.notes[0]
  if (startWithRootNote && !initialPitch) {
    pitch = scale.notes[0]
  }

  return {
    pitchContext: [pitch],
    lastActualPitch: pitch,
    consecutiveRests: 0
  }
}

/**
 * Generates notes for the given steps using Markov chain logic.
 * @param context - The melody generation context.
 * @param initialPitch - Optional initial pitch to start with.
 * @returns Object containing generated notes and the last pitch used.
 */
export function generateNotesForSteps(context: MelodyGenerationContext, initialPitch?: string): NoteGenerationResult {
  const { noteSteps, totalSteps, scale, markovTable, octave, subdivision, n, options } = context
  const { useFixedVelocity, fixedVelocity, startWithRootNote, restProbability = 0 } = options
  const notes: AppNote[] = []

  if (noteSteps.length === 0) {
    return { notes, lastPitch: initialPitch || scale.notes[0] }
  }

  const state = initializeState(context, initialPitch)

  for (let i = 0; i < noteSteps.length; i++) {
    const currentStep = noteSteps[i]
    const durationInSteps = i < noteSteps.length - 1 ? noteSteps[i + 1] - currentStep : totalSteps - currentStep
    const duration = convertStepsToDuration(durationInSteps, subdivision)

    const forceNote = state.consecutiveRests >= 2
    const shouldBeRest = !forceNote && Math.random() < restProbability

    if (shouldBeRest) {
      notes.push({ pitch: null, duration, velocity: 0 })
      state.consecutiveRests++
    } else {
      let nextPitch: string
      if (i === 0 && startWithRootNote && !initialPitch) {
        nextPitch = scale.notes[0]
      } else {
        const pitchNGramContext = state.pitchContext.slice(-Math.max(1, n - 1)).filter(Boolean)
        nextPitch = getNextPitch(pitchNGramContext, markovTable, scale, state.lastActualPitch)
      }

      const velocity = calculateVelocity({ useFixed: useFixedVelocity, fixedValue: fixedVelocity })
      notes.push({
        pitch: getPitchWithOctave(nextPitch, octave),
        duration,
        velocity
      })

      state.lastActualPitch = nextPitch
      state.pitchContext.push(nextPitch)
      state.consecutiveRests = 0
    }
  }

  return { notes, lastPitch: state.lastActualPitch }
}
