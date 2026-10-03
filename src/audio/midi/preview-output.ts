import * as Tone from 'tone'
import { DEFAULT_MIDI_TEST_NOTE, DEFAULT_MIDI_QUEUE_TIMING } from '../../config/defaults'
import type { MidiOutputSettings, MidiResult, MidiTrackKey } from '../../core/midi/output.types'
import type { MidiAccessManager } from './access-manager'
import type { MidiClockBridge } from './clock-bridge'
import { enqueueMidiOutput, type MidiDispatchEvent } from './dispatch'
import { MidiOutputSession, midiTimerWakeup } from './output-session'
import type { MidiQueueEnvironment, MidiQueueTiming } from './port-queue'

export type MidiPreviewKey = 'note' | 'chord' | 'notes' | 'progression' | 'test'
export type MidiPreviewEvent = Omit<MidiDispatchEvent, 'track' | 'generation'> & { durationSeconds: number }

let previewOwnerSequence = 0

export class MidiPreviewOutput {
  private readonly ownerId = ++previewOwnerSequence
  private sessions = new Map<
    MidiPreviewKey,
    { track: MidiTrackKey; midi: MidiOutputSession; timer?: ReturnType<typeof setTimeout> }
  >()
  private sequence = 0
  private transportBlocked = false
  private disposed = false

  private readonly access: MidiAccessManager
  private readonly clock: MidiClockBridge
  private readonly getSettings: () => MidiOutputSettings
  private readonly advanceSeconds: () => number
  private readonly timing: MidiQueueTiming
  private readonly wakeup: MidiQueueEnvironment['wakeup']

  constructor(
    access: MidiAccessManager,
    clock: MidiClockBridge,
    getSettings: () => MidiOutputSettings,
    advanceSeconds: () => number,
    timing: MidiQueueTiming = DEFAULT_MIDI_QUEUE_TIMING,
    wakeup: MidiQueueEnvironment['wakeup'] = midiTimerWakeup
  ) {
    this.access = access
    this.clock = clock
    this.getSettings = getSettings
    this.advanceSeconds = advanceSeconds
    this.timing = timing
    this.wakeup = wakeup
  }

  start(key: MidiPreviewKey, track: MidiTrackKey, events: readonly MidiPreviewEvent[]): MidiResult<void> {
    this.cancel(key)
    const route = this.getSettings()[track]
    if (this.disposed || this.transportBlocked || Tone.getTransport().state === 'started')
      return { ok: false, error: 'External previews are unavailable during transport playback.' }
    if (
      !route.port ||
      this.access.getOpenOutput(track)?.id !== route.port.id ||
      route.mode === 'internal' ||
      (key !== 'test' && !route.sendPreviews)
    )
      return { ok: false, error: 'MIDI preview route is unavailable.' }
    if (!events.length) return { ok: false, error: 'No playable preview notes.' }
    const generation = ++this.sequence
    const sessionId = `preview:${this.ownerId}:${key}:${generation}`
    const midi = new MidiOutputSession(
      sessionId,
      this.access,
      this.clock,
      this.advanceSeconds,
      this.timing,
      this.wakeup,
      () => this.cancelAll()
    )
    const end = Math.max(...events.map((event) => event.onTimeSeconds + event.durationSeconds))
    const session: { track: MidiTrackKey; midi: MidiOutputSession; timer?: ReturnType<typeof setTimeout> } = {
      track,
      midi
    }
    this.sessions.set(key, session)
    try {
      for (const [sequence, event] of events.entries()) {
        enqueueMidiOutput(
          { sessionId, midi, getSettings: this.getSettings },
          { ...event, track, generation },
          event.onTimeSeconds + event.durationSeconds,
          0,
          sequence
        )
        if (this.sessions.get(key)?.midi !== midi) throw new Error('MIDI preview was canceled.')
      }
      const sample = this.clock.sample()
      if (!sample.anchor || sample.changed) throw new Error('MIDI audio clock is not running.')
      session.timer = setTimeout(
        () => this.cancel(key),
        Math.max(0, this.clock.map(end, route.offsetMs) - sample.performanceTimeMs + this.timing.cancelGuardMs)
      )
      return { ok: true, value: undefined }
    } catch (error) {
      this.cancel(key)
      return { ok: false, error: error instanceof Error ? error.message : 'MIDI preview failed.' }
    }
  }

  testNote(track: MidiTrackKey): MidiResult<void> {
    const note = DEFAULT_MIDI_TEST_NOTE
    return this.start('test', track, [
      {
        midiNotes: [{ midi: note.midi, source: { kind: 'preview', sourceId: 'test-note' } }],
        velocity: note.velocity,
        onTimeSeconds: Tone.now(),
        durationSeconds: note.durationSeconds
      }
    ])
  }

  cancel(key: MidiPreviewKey): void {
    const session = this.sessions.get(key)
    if (!session) return
    this.sessions.delete(key)
    if (session.timer) clearTimeout(session.timer)
    session.midi.dispose()
  }

  cancelTrack(track: MidiTrackKey, includeTest = true): void {
    for (const [key, session] of this.sessions)
      if (session.track === track && (includeTest || key !== 'test')) this.cancel(key)
  }

  cancelAll(): void {
    for (const key of this.sessions.keys()) this.cancel(key)
  }

  setTransportBlocked(blocked: boolean): void {
    this.transportBlocked = blocked
    if (blocked) this.cancelAll()
  }

  panic(): void {
    for (const session of this.sessions.values()) session.midi.panic()
    this.cancelAll()
  }

  dispose(): void {
    this.disposed = true
    this.cancelAll()
  }
}
