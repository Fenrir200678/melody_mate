import type { AppNote, AppScale } from '@/ts/models'
import type { MarkovTable } from '@/utils/markov'
import { convertStepsToDuration } from './duration.service'
import { getPitchWithOctave } from './pitch-utils.service'
import { getNextPitch } from '@/utils/pitch'
import { calculateVelocity } from '@/utils/velocity'

/**
 * Service for generating individual notes based on Markov chains and parameters.
 */

export interface NoteGenerationOptions {
  useFixedVelocity: boolean
  fixedVelocity: number
  startWithRootNote?: boolean
  restProbability?: number
  n?: number
}

/**
 * Generates notes for the given steps using Markov chain logic.
 * @param noteSteps - Array of step indices where notes should be placed.
 * @param totalSteps - Total number of steps in the sequence.
 * @param scale - The scale to use for note generation.
 * @param markovTable - The Markov table for pitch prediction.
 * @param octave - The octave for the notes.
 * @param subdivision - The rhythmic subdivision.
 * @param options - Additional generation options.
 * @param initialPitch - Optional initial pitch to start with.
 * @returns Object containing generated notes and the last pitch used.
 */
export function generateNotesForSteps(
  noteSteps: number[],
  totalSteps: number,
  scale: AppScale,
  markovTable: MarkovTable,
  octave: number,
  subdivision: string,
  options: NoteGenerationOptions,
  initialPitch?: string
): { notes: AppNote[]; lastPitch: string } {
  const notes: AppNote[] = []
  if (noteSteps.length === 0) return { notes, lastPitch: initialPitch || scale.notes[0] }

  const { useFixedVelocity, fixedVelocity, startWithRootNote, restProbability = 0, n = 1 } = options

  // State for n-gram context
  let context: string[] = []
  if (initialPitch) {
    context = [initialPitch]
  } else {
    context = [scale.notes[0]]
  }

  let lastPitch = context[context.length - 1]
  if (startWithRootNote && !initialPitch) {
    lastPitch = scale.notes[0]
    context = [scale.notes[0]]
  }

  let lastActualPitch = lastPitch
  let consecutiveRests = 0

  for (let i = 0; i < noteSteps.length; i++) {
    const currentStep = noteSteps[i]
    const durationInSteps = i < noteSteps.length - 1 ? noteSteps[i + 1] - currentStep : totalSteps - currentStep
    const duration = convertStepsToDuration(durationInSteps, subdivision)

    // Prevent more than 2 rests in a row
    const forceNote = consecutiveRests >= 2
    const shouldBeRest = !forceNote && Math.random() < restProbability

    if (shouldBeRest) {
      notes.push({
        pitch: null,
        duration,
        velocity: 0
      })
      consecutiveRests++
      // context bleibt gleich
    } else {
      // It's a note
      let nextPitch: string
      if (i === 0 && startWithRootNote && !initialPitch) {
        nextPitch = scale.notes[0]
      } else {
        // Kontext: die letzten n-1 Noten (ohne nulls)
        const contextForNGram = context.slice(-Math.max(1, n - 1)).filter(Boolean)
        nextPitch = getNextPitch(contextForNGram, markovTable, scale, lastActualPitch)
      }

      const velocity = calculateVelocity({ useFixed: useFixedVelocity, fixedValue: fixedVelocity })
      const pitchWithOctave = getPitchWithOctave(nextPitch, octave)

      notes.push({
        pitch: pitchWithOctave,
        duration,
        velocity
      })
      lastActualPitch = nextPitch
      context.push(nextPitch)
      consecutiveRests = 0
    }
  }

  return { notes, lastPitch: lastActualPitch }
}
