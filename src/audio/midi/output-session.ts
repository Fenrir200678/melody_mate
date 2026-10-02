import { DEFAULT_MIDI_QUEUE_TIMING } from '../../config/defaults'
import { validateMidiAdvanceBudget } from '../../core/transport/output-timing'
import type { MidiNoteScope } from '../../core/midi/note-ownership'
import type { MidiNoteIntent, MidiNoteSource } from '../../core/midi/output.types'
import type { MidiAccessManager } from './access-manager'
import type { MidiClockBridge } from './clock-bridge'
import { MidiPortQueue } from './port-queue'
import type { MidiQueueEnvironment, MidiQueueTiming } from './port-queue'

export type AudioMidiNoteIntent = Omit<MidiNoteIntent, 'portId' | 'onTimeMs' | 'offTimeMs'> & {
  onTimeSeconds: number
  offTimeSeconds: number
  routeOffsetMs: number
}

export const midiTimerWakeup: MidiQueueEnvironment['wakeup'] = (callback, intervalMs) => {
  const handle = setInterval(callback, intervalMs)
  return () => clearInterval(handle)
}

/** Scheduling infrastructure only; the transport/router does not instantiate or dispatch here yet. */
export class MidiOutputSession {
  private readonly access: MidiAccessManager
  private readonly clock: MidiClockBridge
  private readonly lookAheadSeconds: () => number
  private readonly timing: MidiQueueTiming
  private readonly wakeup: MidiQueueEnvironment['wakeup']
  private readonly sessionId: string
  private queues = new Set<MidiPortQueue>()
  private disposed = false

  constructor(
    sessionId: string,
    access: MidiAccessManager,
    clock: MidiClockBridge,
    lookAheadSeconds: () => number,
    timing: MidiQueueTiming = DEFAULT_MIDI_QUEUE_TIMING,
    wakeup: MidiQueueEnvironment['wakeup'] = midiTimerWakeup
  ) {
    if (!sessionId.trim()) throw new Error('MIDI session identity must not be empty.')
    this.sessionId = sessionId
    this.access = access
    this.clock = clock
    this.lookAheadSeconds = lookAheadSeconds
    this.timing = timing
    this.wakeup = wakeup
  }

  enqueue(input: AudioMidiNoteIntent): void {
    if (this.disposed) throw new Error('MIDI output session is disposed.')
    if (input.sessionId !== this.sessionId) throw new Error('MIDI note must belong to this session.')
    if (
      !validateMidiAdvanceBudget(
        input.routeOffsetMs,
        this.lookAheadSeconds(),
        this.timing.pumpIntervalMs,
        this.timing.cancelGuardMs
      )
    ) {
      throw new RangeError('MIDI route offset exceeds the available audio scheduling advance.')
    }
    const port = this.access.getOpenOutput(input.track)
    if (!port) throw new Error('MIDI output is not open.')
    const sample = this.clock.sample()
    if (!sample.anchor) {
      for (const queue of this.queues) queue.pump()
      throw new Error('MIDI audio clock is not running.')
    }
    const clock = this.clock
    const queue = MidiPortQueue.own(
      port,
      {
        clockOwner: clock,
        readClock: () => {
          const current = clock.sample()
          return { nowMs: current.performanceTimeMs, epoch: current.epoch, running: !!current.anchor }
        },
        wakeup: this.wakeup
      },
      this.timing
    )
    this.queues.add(queue)
    queue.pump()
    const { onTimeSeconds, offTimeSeconds, routeOffsetMs, ...identity } = input
    queue.enqueue({
      ...identity,
      portId: port.id,
      onTimeMs: this.clock.map(onTimeSeconds, routeOffsetMs),
      offTimeMs: this.clock.map(offTimeSeconds, routeOffsetMs)
    })
  }

  cancel(scope: MidiNoteScope): void {
    for (const queue of this.queues) queue.cancel({ ...scope, sessionId: this.sessionId })
  }
  releaseScope(scope: MidiNoteScope): void {
    this.cancel(scope)
  }
  reconcile(scope: MidiNoteScope, retainedSources: readonly MidiNoteSource[]): void {
    for (const queue of this.queues) queue.reconcile({ ...scope, sessionId: this.sessionId }, retainedSources)
  }
  resetClock(): void {
    this.clock.reset()
    for (const queue of this.queues) queue.resetClock()
  }
  panic(): void {
    for (const queue of this.queues) queue.panic()
  }
  dispose(): void {
    if (this.disposed) return
    this.cancel({})
    this.queues.clear()
    this.disposed = true
  }
}
