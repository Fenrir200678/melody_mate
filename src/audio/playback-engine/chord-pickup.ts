import { DEFAULT_TRANSPORT_OUTPUT } from '../../config/defaults'
import { chordMidiNotes } from '../../core/midi/live-messages'
import type { ChordEvent } from '../../core/schemas/chord.schema'
import type { ProjectConfig } from '../../core/schemas/project.schema'
import { getActiveChordPickup } from '../../core/transport/chord-pickup'
import type { TrackOutputRouter } from '../output-router'

export function pickupActiveChord(
  outputRouter: TrackOutputRouter,
  chords: ChordEvent[],
  projectConfig: ProjectConfig,
  generation: number,
  currentStep: number,
  onTimeSeconds: number
): void {
  const pickup = getActiveChordPickup(chords, projectConfig.bpm, currentStep)
  if (!pickup) return
  const { chord: activeChord, durationSeconds, stepDurationSeconds } = pickup
  const midiNotes = chordMidiNotes(activeChord)
  outputRouter.dispatch({
    track: 'chord',
    generation,
    pitches: activeChord.voicing,
    midiNotes: midiNotes.ok ? midiNotes.value.notes : [],
    velocity: DEFAULT_TRANSPORT_OUTPUT.chordVelocity,
    onTimeSeconds,
    durationSeconds,
    startStep: currentStep,
    stepDurationSeconds
  })
}
