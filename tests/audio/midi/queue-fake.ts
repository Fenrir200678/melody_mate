import type { MidiNoteIntent } from '../../../src/core/midi/output.types'
import type { MidiQueueEnvironment, MidiQueueTiming } from '../../../src/audio/midi/port-queue'
import { MidiPortQueue } from '../../../src/audio/midi/port-queue'
import { PortFake } from './port-fake'

export const TEST_QUEUE_TIMING: MidiQueueTiming = {
  horizonMs: 30,
  pumpIntervalMs: 10,
  lateOnThresholdMs: 20,
  cancelGuardMs: 2
}

export function intent(eventId: string, overrides: Partial<MidiNoteIntent> = {}): MidiNoteIntent {
  return {
    eventId,
    track: 'lead',
    source: { kind: 'melody', noteId: eventId },
    sessionId: 'transport',
    generation: 1,
    loopIteration: 0,
    portId: 'output-a',
    channel: 1,
    midi: 60,
    velocity: 100,
    onTimeMs: 1010,
    offTimeMs: 1020,
    ...overrides
  }
}

export interface FakeSend {
  bytes: number[]
  timeMs: number
  order: number
}

export class QueueFake {
  nowMs = 1000
  running = true
  epoch = 0
  pending: FakeSend[] = []
  delivered: FakeSend[] = []
  callback?: () => void
  wakeups = 0
  stopped = 0
  clearAdvanceMs = 0
  private order = 0
  port = new PortFake()
  environment: MidiQueueEnvironment = {
    clockOwner: this,
    readClock: () => ({ nowMs: this.nowMs, running: this.running, epoch: this.epoch }),
    wakeup: (callback) => {
      this.callback = callback
      ++this.wakeups
      return () => {
        this.callback = undefined
        ++this.stopped
      }
    }
  }
  queue: MidiPortQueue

  constructor(timing: MidiQueueTiming = TEST_QUEUE_TIMING) {
    this.port.connection = 'open'
    this.port.send.mockImplementation((bytes, timeMs) => {
      this.pending.push({ bytes: [...bytes], timeMs, order: this.order++ })
      this.flush()
    })
    this.port.clear.mockImplementation(() => {
      this.nowMs += this.clearAdvanceMs
      this.flush()
      this.pending = []
    })
    this.queue = MidiPortQueue.own(this.port, this.environment, timing)
  }

  flush() {
    this.pending.sort((a, b) => a.timeMs - b.timeMs || a.order - b.order)
    this.delivered.push(...this.pending.filter((event) => event.timeMs <= this.nowMs))
    this.pending = this.pending.filter((event) => event.timeMs > this.nowMs)
  }

  advance(timeMs: number, pump = true) {
    this.nowMs = timeMs
    this.flush()
    if (pump) this.queue.pump()
  }
}
