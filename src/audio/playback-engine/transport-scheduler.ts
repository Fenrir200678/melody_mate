import * as Tone from 'tone'
import { DEFAULT_TRANSPORT_OUTPUT } from '../../config/defaults'
import { chordMidiNotes, melodyMidiNote } from '../../core/midi/live-messages'
import type { TrackOutputRouter } from '../output-router'
import { getGroovedLeadStarts, getGroovedStartStep } from '../../core/rhythm/groove'
import type { ChordEvent } from '../../core/schemas/chord.schema'
import type { AppNote } from '../../core/schemas/note.schema'
import type { ProjectConfig } from '../../core/schemas/project.schema'
import { STEPS_PER_BAR } from '../../core/schemas/project.schema'
import { getStepDurationSeconds } from '../../core/transport/playback-timing'

export interface TransportSchedulerDeps {
  readonly outputRouter: TrackOutputRouter
}

/**
 * Renders melody notes and accompaniment chords onto the Tone.Transport.
 *
 * Every callback keeps the transport-provided audio timestamp and is validated against its
 * generation before it may touch an audio node, so events from a cancelled session can never
 * start. The scheduler owns the transport event IDs it created so callers can withdraw them.
 */
export class TransportScheduler {
  private leadRevision = 0
  private chordRevision = 0
  private notes: AppNote[] = []
  private chords: ChordEvent[] = []
  private config?: ProjectConfig
  private leadGeneration = 0
  private chordGeneration = 0

  private leadScheduledEventIds: number[] = []
  private chordScheduledEventIds: number[] = []

  private readonly deps: TransportSchedulerDeps

  constructor(deps: TransportSchedulerDeps) {
    this.deps = deps
  }

  scheduleLead(notes: AppNote[], projectConfig: ProjectConfig, eventGeneration: number): void {
    this.clearLead()
    this.notes = notes
    this.config = { ...projectConfig }
    this.leadGeneration = eventGeneration
    const revision = this.leadRevision
    this.deps.outputRouter.setLoop(projectConfig)
    const transport = Tone.getTransport()
    const { outputRouter } = this.deps
    const stepDuration = getStepDurationSeconds(projectConfig.bpm, '16n')
    const stepsPerBar = STEPS_PER_BAR
    const ticksPerStep = (transport.PPQ * 4) / stepsPerBar
    const leadStarts = getGroovedLeadStarts(
      notes.filter((note) => !note.isMuted),
      projectConfig
    )

    for (const note of notes) {
      if (note.isMuted) continue

      const position = `${Math.round((leadStarts.get(note.id) ?? note.step) * ticksPerStep)}i`
      const startStep = Math.round((leadStarts.get(note.id) ?? note.step) * ticksPerStep) / ticksPerStep
      const midiNote = melodyMidiNote(note)
      const durationSeconds = note.durationSteps * stepDuration
      const velocity = Math.max(0.01, Math.min(1.0, note.velocity / 127))

      const eventId = transport.schedule((time) => {
        if (revision !== this.leadRevision) return
        outputRouter.dispatch({
          track: 'lead',
          generation: eventGeneration,
          pitches: note.pitch,
          midiNotes: midiNote.ok ? [midiNote.value] : [],
          velocity,
          onTimeSeconds: time,
          durationSeconds,
          startStep,
          stepDurationSeconds: stepDuration
        })
      }, position)

      this.leadScheduledEventIds.push(eventId)
    }
  }

  scheduleChords(chords: ChordEvent[], projectConfig: ProjectConfig, eventGeneration: number): void {
    this.clearChords()
    this.chords = chords
    this.config = { ...projectConfig }
    this.chordGeneration = eventGeneration
    const revision = this.chordRevision
    this.deps.outputRouter.setLoop(projectConfig)
    const transport = Tone.getTransport()
    const { outputRouter } = this.deps
    const stepsPerBar = STEPS_PER_BAR
    const ticksPerStep = (transport.PPQ * 4) / stepsPerBar
    const stepDuration = getStepDurationSeconds(projectConfig.bpm, '16n')
    const barDurationSeconds = stepDuration * stepsPerBar

    for (const chord of chords) {
      if (!chord.voicing || chord.voicing.length === 0) continue

      const chordStep = chord.startBar * stepsPerBar
      const groovedStep = getGroovedStartStep(chordStep, chord.id, projectConfig)
      const position = `${Math.round(groovedStep * ticksPerStep)}i`
      const durationSeconds = chord.durationBars * barDurationSeconds
      const voicedNotes = chord.voicing
      const midiNotes = chordMidiNotes(chord)
      const startStep = Math.round(groovedStep * ticksPerStep) / ticksPerStep

      const eventId = transport.schedule((time) => {
        if (revision !== this.chordRevision) return
        outputRouter.dispatch({
          track: 'chord',
          generation: eventGeneration,
          pitches: voicedNotes,
          midiNotes: midiNotes.ok ? midiNotes.value.notes : [],
          velocity: DEFAULT_TRANSPORT_OUTPUT.chordVelocity,
          onTimeSeconds: time,
          durationSeconds,
          startStep,
          stepDurationSeconds: stepDuration
        })
      }, position)

      this.chordScheduledEventIds.push(eventId)
    }
  }

  schedule(
    notes: AppNote[],
    chords: ChordEvent[],
    projectConfig: ProjectConfig,
    leadGeneration: number,
    chordGeneration: number = leadGeneration
  ): void {
    this.scheduleLead(notes, projectConfig, leadGeneration)
    this.scheduleChords(chords, projectConfig, chordGeneration)
  }

  clearLead(): void {
    ++this.leadRevision
    this.notes = []
    const transport = Tone.getTransport()
    for (const id of this.leadScheduledEventIds) {
      transport.clear(id)
    }
    this.leadScheduledEventIds = []
  }

  clearChords(): void {
    ++this.chordRevision
    this.chords = []
    const transport = Tone.getTransport()
    for (const id of this.chordScheduledEventIds) {
      transport.clear(id)
    }
    this.chordScheduledEventIds = []
  }

  /**
   * Clears all actively scheduled events from the Tone.Transport. Existing callbacks keep their
   * captured generation, so they stay inert even if the transport still holds a stale queue.
   */
  clear(): void {
    this.clearLead()
    this.clearChords()
  }

  refreshLoop(loop?: Pick<ProjectConfig, 'loopStartStep' | 'loopEndStep' | 'isLooping'>): void {
    if (!this.config) return
    const config = { ...this.config, ...loop }
    const notes = this.notes
    const chords = this.chords
    this.schedule(notes, chords, config, this.leadGeneration, this.chordGeneration)
  }

  /** Drops the tracked IDs without touching the transport, for a caller that already cancelled it. */
  reset(): void {
    ++this.leadRevision
    ++this.chordRevision
    this.notes = []
    this.chords = []
    this.config = undefined
    this.leadScheduledEventIds = []
    this.chordScheduledEventIds = []
  }
}
