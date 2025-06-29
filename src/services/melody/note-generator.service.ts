import type { AppNote } from '@/ts/models'
import { convertStepsToDuration } from './duration.service'
import { getPitchWithOctave } from './pitch-utils.service'
import { getNextPitch } from '@/utils/pitch'
import { calculateVelocity } from './velocity.service'
import { injectRhythmicLicksIntoUnifiedRhythm } from './rhythm-lick.service'
import type { MelodyGenerationContext, NoteGenerationResult } from './melody.types'
import { useGenerationStore } from '@/stores/generation.store'
import { usePlayerStore } from '@/stores/player.store'
import { useChordStore } from '@/stores/chord.store'
import { useRhythmStore } from '@/stores/rhythm.store'

/**
 * Service for generating individual notes based on Markov chains and parameters.
 */

type NoteGenerationState = {
  pitchContext: string[]
  lastActualPitch: string
  consecutiveRests: number
}

function initializeState(context: MelodyGenerationContext, initialPitch?: string): NoteGenerationState {
  const { scale } = context
  const { startWithRootNote, endWithRootNote } = useGenerationStore()

  let pitch = initialPitch || scale.notes[0]
  if (startWithRootNote && !initialPitch) {
    pitch = scale.notes[0]
  } else if (endWithRootNote && !initialPitch) {
    pitch = scale.notes[scale.notes.length - 1]
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
 * @param melodicContour - Optional melodic contour to use.
 * @returns Object containing generated notes and the last pitch used.
 */
export function generateNotesForSteps(
  context: MelodyGenerationContext,
  initialPitch?: string,
  melodicContour?: string
): NoteGenerationResult {
  const { unifiedRhythm, totalSteps, scale, markovTable, minOctave, maxOctave, subdivision, n } = context
  const { useFixedVelocity, fixedVelocity, useDynamics, selectedDynamic } = usePlayerStore()
  const { startWithRootNote, endWithRootNote, useRhythmicLicks, rhythmicLickFrequency, restProbability } =
    useGenerationStore()
  const { chords, useChords } = useChordStore()
  const { rhythm, useCustomRhythm } = useRhythmStore()
  const notes: AppNote[] = []

  if (unifiedRhythm.events.length === 0) {
    return { notes, lastPitch: initialPitch || scale.notes[0] }
  }

  // Apply rhythmic licks if enabled
  const processedRhythm = useRhythmicLicks
    ? injectRhythmicLicksIntoUnifiedRhythm(unifiedRhythm, rhythmicLickFrequency || 0.25)
    : unifiedRhythm

  const state = initializeState(context, initialPitch)

  for (let i = 0; i < processedRhythm.events.length; i++) {
    const event = processedRhythm.events[i]
    const duration = convertStepsToDuration(event.durationInSteps, subdivision)

    // New logic for rest probability
    const isPresetRhythm =
      !useCustomRhythm && (!rhythm || !rhythm.name.toLowerCase().includes('euclidean'))

    if (isPresetRhythm && !event.isRest && Math.random() < (restProbability ?? 0)) {
      notes.push({ pitch: null, duration, velocity: 0 })
      state.consecutiveRests++
      continue
    }

    if (event.isRest) {
      notes.push({ pitch: null, duration, velocity: 0 })
      state.consecutiveRests++
      continue
    }

    const isLastNoteEvent =
      i === processedRhythm.events.length - 1 || processedRhythm.events.slice(i + 1).every((e) => e.isRest)

    if (isLastNoteEvent && endWithRootNote) {
      const nextPitch = scale.notes[0]
      const velocity = calculateVelocity({
        useFixedVelocity: !!useFixedVelocity,
        fixedVelocity,
        dynamics: useDynamics && selectedDynamic ? [selectedDynamic] : undefined
      })
      notes.push({
        pitch: getPitchWithOctave(nextPitch, minOctave, maxOctave),
        duration,
        velocity
      })
      state.lastActualPitch = nextPitch
      state.pitchContext.push(nextPitch)
      state.consecutiveRests = 0
      continue
    }

    let nextPitch: string
    if (i === 0 && startWithRootNote && !initialPitch) {
      nextPitch = scale.notes[0]
    } else {
      const pitchNGramContext = state.pitchContext.slice(-Math.max(1, n - 1)).filter(Boolean)
      const degreeWeights = rhythm && 'degreeWeights' in rhythm ? rhythm.degreeWeights : undefined
      let currentChordNotes: readonly string[] | undefined

      if (useChords) {
        const currentChordIndex = Math.floor(event.step / (totalSteps / chords.length))
        const currentChord = chords[currentChordIndex]
        currentChordNotes = currentChord ? currentChord.notes : []
      }

      const melodyProgress = event.step / totalSteps

      nextPitch = getNextPitch(
        pitchNGramContext,
        markovTable,
        scale,
        state.lastActualPitch,
        degreeWeights,
        currentChordNotes,
        melodyProgress,
        event.step,
        subdivision,
        melodicContour,
        minOctave,
        maxOctave
      )
    }

    const velocity = calculateVelocity({
      useFixedVelocity: !!useFixedVelocity,
      fixedVelocity,
      dynamics: useDynamics && selectedDynamic ? [selectedDynamic] : undefined
    })

    notes.push({
      pitch: getPitchWithOctave(nextPitch, minOctave, maxOctave),
      duration,
      velocity
    })

    state.lastActualPitch = nextPitch
    state.pitchContext.push(nextPitch)
    state.consecutiveRests = 0
  }

  return { notes, lastPitch: state.lastActualPitch }
}
