import * as Tone from 'tone'
import {
  DEFAULT_MIDI_OUTPUT_SETTINGS,
  DEFAULT_MIDI_QUEUE_TIMING,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_TRANSPORT_OUTPUT
} from '../config/defaults'
import { normalizedVelocityToMidi } from '../core/midi/live-messages'
import type { MidiOutputSettings, MidiSourceNote, MidiTrackKey } from '../core/midi/output.types'
import { MidiOutputSettingsSchema } from '../core/midi/output.schema'
import type { EventGenerationTracker } from '../core/synth/event-generation'
import { getMidiDispatchAdvanceSeconds, getOutputGate, type OutputLoopBounds } from '../core/transport/output-gate'
import { validateMidiAdvanceBudget } from '../core/transport/output-timing'
import type { InstrumentHost } from './instrument-host'
import type { AudioMidiNoteIntent, MidiOutputSession } from './midi/output-session'

export interface TrackOutputEvent {
  track: MidiTrackKey
  generation: number
  pitches: string | string[]
  midiNotes: readonly MidiSourceNote[]
  velocity: number
  onTimeSeconds: number
  durationSeconds: number
  startStep: number
  stepDurationSeconds: number
}

/** The transport owns lifecycle release; preview routing remains internal. */
export interface TrackOutputRuntime {
  sessionId: string
  getSettings(): MidiOutputSettings
  midi: Pick<MidiOutputSession, 'enqueue'> &
    Partial<Pick<MidiOutputSession, 'cancel' | 'reconcile' | 'endIteration' | 'panic'>>
  canDispatch?(track: MidiTrackKey): boolean
  resume?(): Promise<void>
  suspend?(): void
  panic?(): void
  dispose?(): void
  onError?(error: unknown, event: TrackOutputEvent): void
}

export interface TrackOutputRouterDeps {
  generations: EventGenerationTracker
  isAudible(track: MidiTrackKey): boolean
  getInstrument(track: MidiTrackKey): InstrumentHost | null
  holdVoice(voiceId: string, holdSeconds: number): void
  runtime?: TrackOutputRuntime
}

export class TrackOutputRouter {
  private loop: OutputLoopBounds = DEFAULT_PROJECT_SETTINGS
  private loopIteration = 0
  private eventSequence = 0

  private readonly deps: TrackOutputRouterDeps

  constructor(deps: TrackOutputRouterDeps) {
    this.deps = deps
  }

  setLoop(loop: OutputLoopBounds): void {
    this.loop = { ...loop }
  }

  isAudible(track: MidiTrackKey): boolean {
    return this.deps.isAudible(track)
  }

  /** Advance ownership before Tone invokes the new iteration's start tick. */
  prepareLoopBoundary(audioTimeSeconds: number) {
    const boundary = {
      sessionId: this.deps.runtime?.sessionId ?? DEFAULT_TRANSPORT_OUTPUT.sessionId,
      loopIteration: this.loopIteration,
      audioTimeSeconds
    }
    this.loopIteration += 1
    return boundary
  }

  dispatch(event: TrackOutputEvent): void {
    const session = event.track === 'lead' ? 'transport-lead' : 'transport-chord'
    if (!this.deps.generations.isCurrent(session, event.generation) || !this.deps.isAudible(event.track)) return
    const gate = getOutputGate(
      event.onTimeSeconds,
      event.durationSeconds,
      event.startStep,
      event.stepDurationSeconds,
      this.loop
    )
    if (gate.durationSeconds <= 0) return
    const runtime = this.deps.runtime
    const settings = runtime?.getSettings()
    const mode = settings?.[event.track].mode ?? DEFAULT_MIDI_OUTPUT_SETTINGS[event.track].mode
    if (mode !== 'midi') {
      const instrument = this.deps.getInstrument(event.track)
      if (instrument) {
        const pitchKey = typeof event.pitches === 'string' ? event.pitches : event.pitches.join(',')
        const handle = this.deps.generations.beginVoice(session, event.generation, pitchKey)[0]
        if (handle) {
          instrument.playNote(handle.id, event.pitches, gate.durationSeconds, event.onTimeSeconds, event.velocity)
          this.deps.holdVoice(handle.id, gate.durationSeconds)
        }
      }
    }
    if (!runtime || mode === 'internal' || (runtime.canDispatch && !runtime.canDispatch(event.track))) return
    try {
      const route = MidiOutputSettingsSchema.parse(settings)[event.track]
      const context = Tone.getContext()
      if (!('updateInterval' in context) || typeof context.updateInterval !== 'number') {
        throw new Error('MIDI output requires a Tone context with a known scheduling interval.')
      }
      const advance = Math.min(
        getMidiDispatchAdvanceSeconds(context.lookAhead, context.updateInterval),
        event.onTimeSeconds - Tone.immediate()
      )
      if (
        !validateMidiAdvanceBudget(
          route.offsetMs,
          advance,
          DEFAULT_MIDI_QUEUE_TIMING.pumpIntervalMs,
          DEFAULT_MIDI_QUEUE_TIMING.cancelGuardMs
        )
      )
        throw new RangeError('MIDI route offset exceeds the actual Tone dispatch advance.')
      const sequence = ++this.eventSequence
      for (const note of event.midiNotes) {
        const intent: AudioMidiNoteIntent = {
          track: event.track,
          source: note.source,
          sessionId: runtime.sessionId,
          generation: event.generation,
          loopIteration: this.loopIteration,
          eventId: `${runtime.sessionId}:${event.track}:${event.generation}:${this.loopIteration}:${sequence}:${note.midi}`,
          channel: route.channel,
          midi: note.midi,
          velocity: normalizedVelocityToMidi(event.velocity),
          onTimeSeconds: event.onTimeSeconds,
          offTimeSeconds: gate.offTimeSeconds,
          routeOffsetMs: route.offsetMs
        }
        runtime.midi.enqueue(intent)
      }
    } catch (error) {
      runtime.onError?.(error, event)
    }
  }
}
