import { DEFAULT_MIDI_QUEUE_TIMING } from '../../config/defaults'
import { encodeNoteOff, encodeNoteOn } from '../../core/midi/live-messages'
import {
  compareMidiQueueEvents,
  matchesMidiScope,
  planMidiPortClear,
  reconcileMidiNotes,
  retriggerMidiNotes
} from '../../core/midi/note-ownership'
import type { MidiNoteScope, MidiQueueEvent, OwnedMidiNote, SubmittedMidiEvent } from '../../core/midi/note-ownership'
import { MidiNoteIntentSchema } from '../../core/midi/output.schema'
import type { MidiNoteIntent, MidiNoteSource } from '../../core/midi/output.types'
import type { MidiOutputPort } from './runtime.types'
import type { MidiQueueEnvironment, MidiQueueTiming } from './port-queue.types'
export type { MidiQueueEnvironment, MidiQueueTiming, MidiQueueClock } from './port-queue.types'

const owners = new WeakMap<MidiOutputPort, MidiPortQueue>()

export function cancelMidiPortScope(port: MidiOutputPort, scope: MidiNoteScope): void {
  owners.get(port)?.cancel(scope)
}

export class MidiPortQueue {
  private readonly port: MidiOutputPort & { clear(): void }
  private readonly environment: MidiQueueEnvironment
  private readonly timing: MidiQueueTiming
  private notes = new Map<string, OwnedMidiNote>()
  private submitted: SubmittedMidiEvent[] = []
  private usedChannels = new Map<number, MidiNoteIntent>()
  private stopWakeup?: () => void
  private disposed = false
  private failed = false
  private epoch: number

  private constructor(port: MidiOutputPort, environment: MidiQueueEnvironment, timing: MidiQueueTiming) {
    if (
      !Object.values(timing).every(Number.isFinite) ||
      timing.pumpIntervalMs <= 0 ||
      timing.horizonMs < timing.pumpIntervalMs + timing.cancelGuardMs ||
      timing.cancelGuardMs < 0 ||
      timing.lateOnThresholdMs < 0
    ) {
      throw new RangeError('Invalid MIDI queue timing budget.')
    }
    if (typeof port.clear !== 'function') throw new Error('MIDI output requires clear() for safe cancellation.')
    this.port = port as MidiOutputPort & { clear(): void }
    this.environment = environment
    this.timing = timing
    this.epoch = environment.readClock().epoch
  }

  static own(
    port: MidiOutputPort,
    environment: MidiQueueEnvironment,
    timing: MidiQueueTiming = DEFAULT_MIDI_QUEUE_TIMING
  ): MidiPortQueue {
    const owner = owners.get(port)
    if (owner && !owner.disposed) {
      if (
        environment.clockOwner !== owner.environment.clockOwner ||
        Object.keys(timing).some(
          (key) => timing[key as keyof MidiQueueTiming] !== owner.timing[key as keyof MidiQueueTiming]
        )
      ) {
        throw new Error('Shared MIDI port requires the same clock owner and timing policy.')
      }
      return owner
    }
    const queue = new MidiPortQueue(port, environment, timing)
    if (owner) {
      queue.notes = new Map([...owner.notes].filter(([, entry]) => entry.releaseOnly))
      queue.submitted = [...owner.submitted]
      queue.failed = owner.failed
    }
    owners.set(port, queue)
    return queue
  }

  getSnapshot() {
    return {
      disposed: this.disposed,
      failed: this.failed,
      notes: [...this.notes.values()]
        .filter((entry) => !entry.releaseOnly)
        .map(({ note, onSubmitted, offSubmitted }) => ({
          note: structuredClone(note),
          onSubmitted,
          offSubmitted
        })),
      releaseObligations: [...this.notes.values()]
        .filter((entry) => entry.releaseOnly)
        .map((entry) => structuredClone(entry)),
      submitted: structuredClone(this.submitted)
    }
  }

  enqueue(input: MidiNoteIntent): void {
    if (this.disposed || this.failed) throw new Error('MIDI port queue is unavailable.')
    const note = MidiNoteIntentSchema.parse(input)
    const now = this.environment.readClock().nowMs
    if (this.submitted.some((event) => event.kind === 'panic' && event.timeMs >= now - this.timing.cancelGuardMs)) {
      throw new Error('MIDI panic cleanup is still pending.')
    }
    if (note.portId !== this.port.id || this.notes.has(note.eventId))
      throw new Error('Invalid port or duplicate MIDI event identity.')
    if (
      [...this.notes.values()].some((entry) => entry.note.channel === note.channel && entry.note.track !== note.track)
    ) {
      throw new Error('MIDI tracks must use different port/channel pairs.')
    }
    const existing = [...this.notes.values()].map((entry) => entry.note)
    const replacement = retriggerMidiNotes(existing, note)
    const ids = new Set(replacement.map((entry) => entry.eventId))
    const removed = new Set(existing.filter((entry) => !ids.has(entry.eventId)).map((entry) => entry.eventId))
    const changedSubmittedOff = replacement.some((entry) => {
      const old = this.notes.get(entry.eventId)
      return old?.offSubmitted && old.note.offTimeMs !== entry.offTimeMs
    })
    const reorderSubmittedOn = replacement.some((entry) => {
      const old = this.notes.get(entry.eventId)
      return (
        (!old || old.note.offTimeMs !== entry.offTimeMs) &&
        this.submitted.some((event) => event.kind === 'on' && event.timeMs === entry.offTimeMs)
      )
    })
    if (removed.size) this.cancelIds(removed)
    for (const entry of replacement) {
      const old = this.notes.get(entry.eventId)
      if (old) old.note = entry
      else if (entry.eventId === note.eventId)
        this.notes.set(entry.eventId, { note: entry, onSubmitted: false, offSubmitted: false })
    }
    if (changedSubmittedOff || reorderSubmittedOn) this.rebuild(new Set())
    this.arm()
  }

  private arm(): void {
    if (this.stopWakeup || !this.notes.size || this.disposed) return
    this.stopWakeup = this.environment.wakeup(() => {
      try {
        this.pump()
      } catch {
        /* pump has already closed scheduling and attempted emergency cleanup. */
      }
    }, this.timing.pumpIntervalMs)
  }

  private send(
    event: MidiQueueEvent,
    timestampMs: number,
    bytes: number[],
    kind: SubmittedMidiEvent['kind'] = event.kind
  ): void {
    // Ledger records submissions, never confirmed physical delivery, even when send throws.
    this.submitted.push({ note: { ...event.note }, kind, timeMs: timestampMs, bytes: [...bytes] })
    try {
      this.port.send(bytes, timestampMs)
    } catch (error) {
      this.failed = true
      throw error
    }
  }

  private release(note: MidiNoteIntent, nowMs: number): void {
    const off = encodeNoteOff(note.channel, note.midi)
    if (off.ok) this.send({ note, kind: 'off', timeMs: nowMs }, nowMs, off.value)
  }

  pump(): void {
    try {
      this.drain()
    } catch (error) {
      this.failed = true
      this.panic()
      throw error
    }
  }

  private drain(): void {
    if (this.disposed || this.failed) return
    const clock = this.environment.readClock()
    if (!clock.running || clock.epoch !== this.epoch) {
      this.epoch = clock.epoch
      if ([...this.notes.values()].some((entry) => !entry.releaseOnly)) {
        this.resetClock()
        return
      }
    }
    const now = clock.nowMs
    if (!Number.isFinite(now) || now < 0) throw new RangeError('Invalid performance clock.')
    for (const [id, entry] of this.notes) {
      if (entry.offSubmitted && (entry.offSubmittedTimeMs ?? entry.note.offTimeMs) < now - this.timing.cancelGuardMs)
        this.notes.delete(id)
    }
    this.submitted = this.submitted.filter((event) => event.timeMs >= now - this.timing.cancelGuardMs)
    const events: MidiQueueEvent[] = [...this.notes.values()]
      .flatMap(({ note, onSubmitted, offSubmitted }) => [
        ...(!onSubmitted ? [{ note, kind: 'on' as const, timeMs: note.onTimeMs }] : []),
        ...(!offSubmitted ? [{ note, kind: 'off' as const, timeMs: note.offTimeMs }] : [])
      ])
      .sort(compareMidiQueueEvents)
    for (const event of events) {
      if (event.timeMs > now + this.timing.horizonMs) break
      const entry = this.notes.get(event.note.eventId)
      if (!entry) continue
      if (event.kind === 'on' && (now - event.timeMs > this.timing.lateOnThresholdMs || entry.note.offTimeMs <= now)) {
        this.notes.delete(event.note.eventId)
        continue
      }
      if (event.kind === 'off' && !entry.onSubmitted) continue
      const bytes =
        event.kind === 'on'
          ? encodeNoteOn(entry.note.channel, entry.note.midi, entry.note.velocity)
          : encodeNoteOff(entry.note.channel, entry.note.midi)
      if (!bytes.ok) throw new Error(bytes.error)
      if (event.kind === 'on') entry.onSubmitted = true
      else {
        entry.offSubmitted = true
        entry.offSubmittedTimeMs = Math.max(now, event.timeMs)
      }
      this.usedChannels.set(entry.note.channel, entry.note)
      this.send(event, Math.max(now, event.timeMs), bytes.value)
    }
    if (!this.notes.size) {
      this.stopWakeup?.()
      this.stopWakeup = undefined
    }
  }

  cancel(scope: MidiNoteScope): void {
    this.cancelIds(
      new Set(
        [...this.notes.values()].filter(({ note }) => matchesMidiScope(note, scope)).map(({ note }) => note.eventId)
      )
    )
  }

  releaseScope(scope: MidiNoteScope): void {
    this.cancel(scope)
  }

  reconcile(scope: MidiNoteScope, retainedSources: readonly MidiNoteSource[]): void {
    const now = this.environment.readClock().nowMs
    const possible = new Set(
      [...this.notes.values()]
        .filter((entry) => entry.onSubmitted && entry.note.onTimeMs <= now + this.timing.cancelGuardMs)
        .map((entry) => entry.note.eventId)
    )
    this.cancelIds(
      new Set(
        reconcileMidiNotes(
          [...this.notes.values()].map(({ note }) => note),
          scope,
          retainedSources,
          possible
        )
      )
    )
  }

  private cancelIds(ids: Set<string>): void {
    if (this.disposed || !ids.size) return
    this.rebuild(ids)
  }

  private rebuild(canceled: Set<string>): void {
    try {
      this.clearAndRebuild(canceled)
    } catch (error) {
      this.failed = true
      this.panic()
      throw error
    }
  }

  private clearAndRebuild(canceled: Set<string>): void {
    this.port.clear()
    // clear is port-wide. Time must be sampled after it, across a possible driver boundary.
    const now = this.environment.readClock().nowMs
    const panicEvents = new Map(
      this.submitted
        .filter((event) => event.kind === 'panic' && event.timeMs >= now - this.timing.cancelGuardMs)
        .map((event) => [event.bytes.join(','), event])
    )
    const plan = planMidiPortClear([...this.notes.values()], this.submitted, canceled, now, this.timing.cancelGuardMs)
    this.submitted = this.submitted.filter((event) => event.kind === 'on' && event.timeMs <= now)
    for (const note of plan.releases) {
      this.release(note, now)
      plan.retained.push({
        note: { ...note, offTimeMs: now },
        onSubmitted: true,
        offSubmitted: true,
        offSubmittedTimeMs: now,
        releaseOnly: true
      })
    }
    this.notes = new Map(plan.retained.map((entry) => [entry.note.eventId, entry]))
    for (const event of panicEvents.values())
      this.send({ note: event.note, kind: 'off', timeMs: now }, now, event.bytes, 'panic')
    this.pump()
  }

  resetClock(): void {
    if (this.disposed) return
    this.epoch = this.environment.readClock().epoch
    this.cancel({})
  }

  panic(): void {
    if (this.disposed) return
    let cleared = true
    try {
      this.port.clear()
    } catch {
      cleared = false
      this.failed = true
    }
    const now = this.environment.readClock().nowMs
    const releases: OwnedMidiNote[] = []
    for (const { note, onSubmitted } of this.notes.values()) {
      if (onSubmitted) {
        try {
          this.release(note, now)
          // A failed clear can leave a future attack in the driver; follow it with an explicit Off.
          if (!cleared && note.onTimeMs > now) this.release(note, note.onTimeMs)
          releases.push({
            note: { ...note, offTimeMs: now },
            onSubmitted: true,
            offSubmitted: true,
            offSubmittedTimeMs: now,
            releaseOnly: true
          })
        } catch {
          /* Best-effort cleanup continues on other notes. */
        }
      }
    }
    for (const [channel, note] of this.usedChannels) {
      for (const controller of [64, 123, 120]) {
        try {
          this.send({ note, kind: 'off', timeMs: now }, now, [0xb0 | (channel - 1), controller, 0], 'panic')
        } catch {
          /* Disconnected ports cannot acknowledge cleanup. */
        }
      }
    }
    this.notes = new Map(releases.map((entry) => [entry.note.eventId, entry]))
    if (this.failed || !this.notes.size) {
      this.stopWakeup?.()
      this.stopWakeup = undefined
    } else this.arm()
  }

  dispose(): void {
    if (this.disposed) return
    this.panic()
    this.disposed = true
    this.stopWakeup?.()
    this.stopWakeup = undefined
  }
}
