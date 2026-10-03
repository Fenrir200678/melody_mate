import * as Tone from 'tone'
import {
  DEFAULT_MIDI_OUTPUT_SETTINGS,
  DEFAULT_MIDI_QUEUE_TIMING,
  DEFAULT_TRANSPORT_OUTPUT
} from '../../config/defaults'
import { MidiOutputSettingsSchema } from '../../core/midi/output.schema'
import type { MidiOutputSettings, MidiTrackKey, MidiTrackRoute } from '../../core/midi/output.types'
import { getMidiDispatchAdvanceSeconds } from '../../core/transport/output-gate'
import { validateMidiAdvanceBudget } from '../../core/transport/output-timing'
import type { TrackOutputRuntime } from '../output-router'
import type { MidiOutputPort } from './runtime.types'
import type { MidiAccessManager } from './access-manager'
import type { MidiClockBridge } from './clock-bridge'
import { MidiPreviewOutput } from './preview-output'
import { MidiOutputSession, midiTimerWakeup } from './output-session'
import type { MidiQueueEnvironment, MidiQueueTiming } from './port-queue'
import { disconnectMidiPort, recoverMidiPort } from './port-queue'

export class MidiTransportOutput implements TrackOutputRuntime {
  readonly sessionId = DEFAULT_TRANSPORT_OUTPUT.sessionId
  readonly previews: MidiPreviewOutput
  readonly midi: MidiOutputSession
  private settings: MidiOutputSettings = structuredClone(DEFAULT_MIDI_OUTPUT_SETTINGS)
  private armed = new Set<MidiTrackKey>()
  private preparing = new Set<MidiTrackKey>()
  private operation = 0
  private routeTail: Promise<unknown> = Promise.resolve()
  private routeOperations = { lead: 0, chord: 0 }
  private unsubscribe: () => void
  private disposed = false
  private suspending = false
  private readonly access: MidiAccessManager
  private readonly advanceSeconds: () => number
  private previousPorts = new Map<MidiTrackKey, MidiOutputPort>()

  constructor(
    access: MidiAccessManager,
    clock: MidiClockBridge,
    advanceSeconds: () => number = () => {
      const context = Tone.getContext()
      if (!('updateInterval' in context) || typeof context.updateInterval !== 'number')
        throw new Error('MIDI output requires a known Tone scheduling interval.')
      return getMidiDispatchAdvanceSeconds(context.lookAhead, context.updateInterval)
    },
    timing: MidiQueueTiming = DEFAULT_MIDI_QUEUE_TIMING,
    wakeup: MidiQueueEnvironment['wakeup'] = midiTimerWakeup
  ) {
    this.access = access
    this.advanceSeconds = advanceSeconds
    this.midi = new MidiOutputSession(this.sessionId, access, clock, advanceSeconds, timing, wakeup, () =>
      this.suspend()
    )
    this.previews = new MidiPreviewOutput(access, clock, () => this.getSettings(), advanceSeconds, timing, wakeup)
    this.unsubscribe = access.subscribe((snapshot) => {
      for (const track of ['lead', 'chord'] as const) {
        const port = access.getOpenOutput(track)
        const previous = this.previousPorts.get(track)
        if (!snapshot.enabled || (!port && previous)) {
          this.previews.cancelTrack(track)
          this.armed.delete(track)
          if (!snapshot.enabled || snapshot.routes[track].status === 'disconnected') {
            ++this.operation
            ++this.routeOperations[track]
          }
          if (
            previous &&
            (previous.state !== 'connected' ||
              previous.connection !== 'open' ||
              snapshot.routes[track].status === 'disconnected')
          )
            disconnectMidiPort(previous)
          else if (previous) this.midi.cancel({ track })
        }
        if (port) this.previousPorts.set(track, port)
        else this.previousPorts.delete(track)
      }
    })
  }

  onError(): void {
    this.suspend()
  }

  getSettings(): MidiOutputSettings {
    return structuredClone(this.settings)
  }

  canDispatch(track: MidiTrackKey): boolean {
    return !this.disposed && this.armed.has(track) && !this.preparing.has(track) && !!this.access.getOpenOutput(track)
  }

  private validateRoute(settings: MidiOutputSettings, track: MidiTrackKey): void {
    MidiOutputSettingsSchema.parse(settings)
    const route = settings[track]
    if (route.mode === 'internal') return
    if (!route.port) throw new Error('Select a MIDI output before changing the route.')
    if (
      !validateMidiAdvanceBudget(
        route.offsetMs,
        this.advanceSeconds(),
        DEFAULT_MIDI_QUEUE_TIMING.pumpIntervalMs,
        DEFAULT_MIDI_QUEUE_TIMING.cancelGuardMs
      )
    )
      throw new RangeError('MIDI route offset exceeds the audio scheduling advance.')
  }

  setRoute(track: MidiTrackKey, route: MidiTrackRoute): Promise<boolean> {
    const operation = ++this.routeOperations[track]
    const lifecycle = this.operation
    const change = this.routeTail
      .then(() => this.changeRoute(track, route, operation, lifecycle))
      .finally(() => {
        this.preparing.delete(track)
      })
    this.routeTail = change.catch(() => {})
    return change
  }

  private async changeRoute(
    track: MidiTrackKey,
    route: MidiTrackRoute,
    operation: number,
    lifecycle: number
  ): Promise<boolean> {
    if (this.disposed || operation !== this.routeOperations[track] || lifecycle !== this.operation) return false
    const candidate = MidiOutputSettingsSchema.parse({ ...this.settings, [track]: route })
    this.validateRoute(candidate, track)
    const wasArmed = this.armed.has(track)
    if (route.mode !== 'internal') {
      const prepared = await this.access.open(track, route.port!.id, () => {
        if (operation !== this.routeOperations[track] || lifecycle !== this.operation || this.disposed)
          throw new Error('MIDI route preparation was canceled.')
        this.validateRoute({ ...this.settings, [track]: candidate[track] }, track)
        this.preparing.add(track)
      })
      if (!prepared || operation !== this.routeOperations[track] || lifecycle !== this.operation || this.disposed)
        return false
    }
    this.previews.cancelTrack(track)
    this.midi.cancel({ track })
    this.settings = MidiOutputSettingsSchema.parse({ ...this.settings, [track]: candidate[track] })
    if (route.mode === 'internal') {
      this.armed.delete(track)
      await this.access.close(track)
    } else if (wasArmed) this.armed.add(track)
    return true
  }

  setSendPreviews(enabled: boolean): void {
    for (const track of ['lead', 'chord'] as const) {
      this.settings[track] = { ...this.settings[track], sendPreviews: enabled }
      if (!enabled) this.previews.cancelTrack(track, false)
    }
  }

  async resume(): Promise<void> {
    if (this.disposed) return
    const operation = ++this.operation
    this.armed.clear()
    this.midi.cancel({})
    this.midi.resetClock()
    if (!this.access.getSnapshot().enabled) return
    const ready = new Set<MidiTrackKey>()
    const recovered = new Set<MidiOutputPort>()
    for (const track of ['lead', 'chord'] as const) {
      const route = this.settings[track]
      if (route.mode === 'internal' || !route.port) continue
      const prepared = await this.access.open(track, route.port.id, () => this.validateRoute(this.settings, track))
      if (this.disposed || operation !== this.operation) return
      if (prepared) {
        const port = this.access.getOpenOutput(track)!
        if (!recovered.has(port)) {
          recoverMidiPort(port)
          this.midi.recoverPort(port)
          recovered.add(port)
        }
        ready.add(track)
      }
    }
    if (!this.disposed && operation === this.operation) this.armed = ready
  }

  suspend(): void {
    if (this.disposed || this.suspending) return
    this.suspending = true
    this.previews.cancelAll()
    this.armed.clear()
    ++this.operation
    ++this.routeOperations.lead
    ++this.routeOperations.chord
    this.access.cancelPending()
    try {
      this.midi.cancel({})
    } finally {
      this.suspending = false
    }
  }

  panic(): void {
    this.previews.panic()
    this.suspend()
    this.midi.panic()
  }

  dispose(): void {
    if (this.disposed) return
    this.suspend()
    this.disposed = true
    this.unsubscribe()
    this.previews.dispose()
    this.midi.dispose()
  }
}
