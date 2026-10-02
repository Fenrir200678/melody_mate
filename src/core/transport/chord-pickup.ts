import type { ChordEvent } from '../schemas/chord.schema'
import { DEFAULT_TRANSPORT_OUTPUT } from '../../config/defaults'
import { STEPS_PER_BAR } from '../schemas/project.schema'
import { getStepDurationSeconds } from './playback-timing'

export function getActiveChordPickup(chords: ChordEvent[], bpm: number, currentStep: number) {
  const currentBar = currentStep / STEPS_PER_BAR
  const chord = chords.find(
    (event) =>
      event.voicing.length > 0 && currentBar >= event.startBar && currentBar < event.startBar + event.durationBars
  )
  if (!chord) return null
  const stepDurationSeconds = getStepDurationSeconds(bpm, '16n')
  const durationSeconds = ((chord.startBar + chord.durationBars) * STEPS_PER_BAR - currentStep) * stepDurationSeconds
  return durationSeconds > DEFAULT_TRANSPORT_OUTPUT.minChordPickupSeconds
    ? { chord, durationSeconds, stepDurationSeconds }
    : null
}
