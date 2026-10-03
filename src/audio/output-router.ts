import { DEFAULT_MIDI_OUTPUT_SETTINGS, DEFAULT_PROJECT_SETTINGS, DEFAULT_TRANSPORT_OUTPUT } from '../config/defaults'
import type { MidiOutputSettings, MidiSourceNote, MidiTrackKey } from '../core/midi/output.types'
import type { EventGenerationTracker } from '../core/synth/event-generation'
import { getOutputGate, type OutputLoopBounds } from '../core/transport/output-gate'
import type { InstrumentHost } from './instrument-host'
import type { MidiOutputSession } from './midi/output-session'
import { enqueueMidiOutput } from './midi/dispatch'
import type { MidiPreviewOutput, MidiPreviewKey, MidiPreviewEvent } from './midi/preview-output'

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

/** Each output session owns its lifecycle and shares the physical port queue. */
export interface TrackOutputRuntime {
  sessionId: string
  previews?: MidiPreviewOutput
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
      enqueueMidiOutput(runtime, event, gate.offTimeSeconds, this.loopIteration, ++this.eventSequence)
    } catch (error) {
      runtime.onError?.(error, event)
    }
  }

  preview(key: MidiPreviewKey, track: MidiTrackKey, events: readonly MidiPreviewEvent[]): void {
    this.deps.runtime?.previews?.start(key, track, events)
  }

  cancelPreview(key: MidiPreviewKey): void {
    this.deps.runtime?.previews?.cancel(key)
  }

  cancelPreviews(): void {
    this.deps.runtime?.previews?.cancelAll()
  }

  blockPreviews(blocked: boolean): void {
    this.deps.runtime?.previews?.setTransportBlocked(blocked)
  }

  testMidiNote(track: MidiTrackKey) {
    return this.deps.runtime?.previews?.testNote(track) ?? { ok: false as const, error: 'MIDI is unavailable.' }
  }
}
