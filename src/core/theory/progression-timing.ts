import { STEPS_PER_BAR } from '../schemas/project.schema'
import type { PredefinedProgression, PresetChord } from './progressions.types'

export interface TimedPresetChord {
  chord: PresetChord
  startBar: number
}

/** Explicit onsets leave room for stab rests; sequential phrases must fill their declared length. */
export function resolvePresetTiming(progression: PredefinedProgression): TimedPresetChord[] {
  if (!Number.isInteger(progression.bars) || progression.bars < 1 || progression.chords.length === 0) {
    throw new Error(`Invalid progression length: ${progression.id}`)
  }

  let endBar = 0
  const timeline = progression.chords.map((chord) => {
    const startBar = chord.startBar ?? endBar
    const durationSteps = chord.durationBars * STEPS_PER_BAR
    if (!Number.isInteger(durationSteps) || durationSteps < 1) {
      throw new Error(`Invalid chord duration in progression: ${progression.id}`)
    }
    if (!Number.isInteger(startBar * STEPS_PER_BAR) || startBar < endBar) {
      throw new Error(`Invalid or overlapping chord onset in progression: ${progression.id}`)
    }
    endBar = startBar + chord.durationBars
    if (endBar > progression.bars) {
      throw new Error(`Chord exceeds progression length: ${progression.id}`)
    }
    return { chord, startBar }
  })

  if (progression.chords.every((chord) => chord.startBar === undefined) && endBar !== progression.bars) {
    throw new Error(`Chord durations do not fill progression: ${progression.id}`)
  }
  return timeline
}
