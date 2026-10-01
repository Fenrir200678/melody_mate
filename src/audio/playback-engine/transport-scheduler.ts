import * as Tone from 'tone'
import type { InstrumentHost } from '../instrument-host'
import { getGroovedLeadStarts, getGroovedStartStep } from '../../core/rhythm/groove'
import type { ChordEvent } from '../../core/schemas/chord.schema'
import type { AppNote } from '../../core/schemas/note.schema'
import type { ProjectConfig } from '../../core/schemas/project.schema'
import { STEPS_PER_BAR } from '../../core/schemas/project.schema'
import type { EventGenerationTracker } from '../../core/synth/event-generation'
import type { EffectsRack } from '../mixer'
import { getStepDurationSeconds } from '../../core/transport/playback-timing'

export interface TransportSchedulerDeps {
  readonly effectsRack: EffectsRack
  readonly generations: EventGenerationTracker
  getLeadSynth(): InstrumentHost | null
  getChordSynth(): InstrumentHost | null
  /** Keeps voice ownership bounded after a note-on, in case no release callback follows. */
  holdVoice(voiceId: string, holdSeconds: number): void
}

/**
 * Renders melody notes and accompaniment chords onto the Tone.Transport.
 *
 * Every callback keeps the transport-provided audio timestamp and is validated against its
 * generation before it may touch an audio node, so events from a cancelled session can never
 * start. The scheduler owns the transport event IDs it created so callers can withdraw them.
 */
export class TransportScheduler {
  private leadScheduledEventIds: number[] = []
  private chordScheduledEventIds: number[] = []

  private readonly deps: TransportSchedulerDeps

  constructor(deps: TransportSchedulerDeps) {
    this.deps = deps
  }

  scheduleLead(notes: AppNote[], projectConfig: ProjectConfig, eventGeneration: number): void {
    this.clearLead()
    const transport = Tone.getTransport()
    const { generations, effectsRack } = this.deps
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
      const durationSeconds = note.durationSteps * stepDuration
      const velocity = Math.max(0.01, Math.min(1.0, note.velocity / 127))

      const eventId = transport.schedule((time) => {
        if (!generations.isCurrent('transport-lead', eventGeneration)) return
        const leadSynth = this.deps.getLeadSynth()
        if (!effectsRack.isLeadAudible() || !leadSynth) return
        const handle = generations.beginVoice('transport-lead', eventGeneration, note.pitch)[0]
        if (!handle) return
        leadSynth.playNote(handle.id, note.pitch, durationSeconds, time, velocity)
        this.deps.holdVoice(handle.id, durationSeconds)
      }, position)

      this.leadScheduledEventIds.push(eventId)
    }
  }

  scheduleChords(chords: ChordEvent[], projectConfig: ProjectConfig, eventGeneration: number): void {
    this.clearChords()
    const transport = Tone.getTransport()
    const { generations, effectsRack } = this.deps
    const stepsPerBar = STEPS_PER_BAR
    const ticksPerStep = (transport.PPQ * 4) / stepsPerBar
    const beatDuration = 60 / Math.max(20, projectConfig.bpm)
    const barDurationSeconds = beatDuration * 4

    for (const chord of chords) {
      if (!chord.voicing || chord.voicing.length === 0) continue

      const chordStep = chord.startBar * stepsPerBar
      const groovedStep = getGroovedStartStep(chordStep, chord.id, projectConfig)
      const position = `${Math.round(groovedStep * ticksPerStep)}i`
      const durationSeconds = chord.durationBars * barDurationSeconds
      const voicedNotes = chord.voicing

      const eventId = transport.schedule((time) => {
        if (!generations.isCurrent('transport-chord', eventGeneration)) return
        const chordSynth = this.deps.getChordSynth()
        if (!effectsRack.isChordAudible() || !chordSynth) return
        const handle = generations.beginVoice('transport-chord', eventGeneration, voicedNotes.join(','))[0]
        if (!handle) return
        chordSynth.playNote(handle.id, voicedNotes, durationSeconds, time, 0.75)
        this.deps.holdVoice(handle.id, durationSeconds)
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
    const transport = Tone.getTransport()
    for (const id of this.leadScheduledEventIds) {
      transport.clear(id)
    }
    this.leadScheduledEventIds = []
  }

  clearChords(): void {
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

  /** Drops the tracked IDs without touching the transport, for a caller that already cancelled it. */
  reset(): void {
    this.leadScheduledEventIds = []
    this.chordScheduledEventIds = []
  }
}
