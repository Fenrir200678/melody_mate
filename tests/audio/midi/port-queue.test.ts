import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_MIDI_QUEUE_TIMING } from '../../../src/config/defaults'
import { MidiPortQueue } from '../../../src/audio/midi/port-queue'
import { intent, QueueFake, TEST_QUEUE_TIMING } from './queue-fake'
import { PortFake } from './port-fake'

const harnesses: QueueFake[] = []
function setup() {
  const fake = new QueueFake()
  harnesses.push(fake)
  return fake
}
afterEach(() => {
  for (const fake of harnesses.splice(0)) fake.queue.dispose()
})

describe('owned MIDI port queue', () => {
  it('has exactly one owner and wakeup per port', () => {
    const fake = setup()
    expect(MidiPortQueue.own(fake.port, fake.environment, TEST_QUEUE_TIMING)).toBe(fake.queue)
    fake.queue.enqueue(intent('short'))
    fake.queue.enqueue(intent('other', { midi: 64 }))
    expect(fake.wakeups).toBe(1)
    fake.queue.pump()
    fake.advance(1040)
    expect(fake.stopped).toBe(1)
  })

  it('sends complete short gates with explicit timestamps and retains long releases locally', () => {
    const fake = setup()
    fake.queue.enqueue(intent('short'))
    fake.queue.enqueue(intent('long', { midi: 64, offTimeMs: 3000 }))
    fake.queue.pump()
    expect(fake.port.send.mock.calls).toEqual([
      [[0x90, 60, 100], 1010],
      [[0x90, 64, 100], 1010],
      [[0x80, 60, 0], 1020]
    ])
    expect(fake.queue.getSnapshot().notes.find((entry) => entry.note.eventId === 'long')?.offSubmitted).toBe(false)
    fake.advance(2970)
    expect(fake.pending).toEqual([expect.objectContaining({ bytes: [0x80, 64, 0], timeMs: 3000 })])
    fake.advance(3010)
    expect(fake.queue.getSnapshot().notes).toEqual([])
    expect(fake.delivered.map((event) => event.bytes)).toEqual([
      [0x90, 60, 100],
      [0x90, 64, 100],
      [0x80, 60, 0],
      [0x80, 64, 0]
    ])
  })

  it('never submits a whole future song to the browser port', () => {
    const fake = setup()
    for (let index = 0; index < 20; ++index)
      fake.queue.enqueue(intent(`note-${index}`, { onTimeMs: 1100 + index * 100, offTimeMs: 1150 + index * 100 }))
    fake.queue.pump()
    expect(fake.port.send).not.toHaveBeenCalled()
    fake.advance(1070)
    expect(fake.port.send.mock.calls).toEqual([[[0x90, 60, 100], 1100]])
  })

  it('cancels local and submitted future attacks without starting them or sending broad controllers', () => {
    const fake = setup()
    fake.queue.enqueue(intent('submitted'))
    fake.queue.enqueue(intent('local', { midi: 64, onTimeMs: 2000, offTimeMs: 3000 }))
    fake.queue.pump()
    fake.queue.cancel({ track: 'lead' })
    fake.advance(4000)
    expect(fake.delivered).toEqual([])
    expect(fake.pending).toEqual([])
    expect(fake.queue.getSnapshot().notes).toEqual([])
  })

  it('preserves sounding chords and their long off after melody cancel on the shared port', () => {
    const fake = setup()
    fake.queue.enqueue(intent('melody', { onTimeMs: 1000, offTimeMs: 3000 }))
    fake.queue.enqueue(
      intent('chord', {
        track: 'chord',
        channel: 2,
        source: { kind: 'chord', chordId: 'C', midi: 60 },
        onTimeMs: 1000,
        offTimeMs: 4000
      })
    )
    fake.queue.pump()
    fake.queue.cancel({ track: 'lead' })
    expect(fake.delivered.map((event) => event.bytes)).toEqual([
      [0x90, 60, 100],
      [0x91, 60, 100],
      [0x80, 60, 0]
    ])
    fake.advance(3980)
    fake.advance(4010)
    expect(fake.delivered.map((event) => event.bytes)).toEqual([
      [0x90, 60, 100],
      [0x91, 60, 100],
      [0x80, 60, 0],
      [0x81, 60, 0]
    ])
  })

  it('rebuilds definitely future attacks and releases of another session', () => {
    const fake = setup()
    fake.queue.enqueue(intent('transport'))
    fake.queue.enqueue(intent('preview', { sessionId: 'preview', midi: 64, onTimeMs: 1020, offTimeMs: 1040 }))
    fake.queue.pump()
    fake.queue.cancel({ sessionId: 'transport' })
    fake.advance(1045)
    expect(fake.delivered.map((event) => event.bytes)).toEqual([
      [0x90, 64, 100],
      [0x80, 64, 0]
    ])
  })

  it.each([1008, 1010, 1012])(
    'samples after clear at %i and never replays a potentially due canceled On',
    (afterClear) => {
      const fake = setup()
      fake.queue.enqueue(intent('race', { offTimeMs: 3000 }))
      fake.queue.pump()
      fake.clearAdvanceMs = afterClear - fake.nowMs
      fake.queue.cancel({ sessionId: 'transport' })
      expect(fake.port.send.mock.calls.filter(([bytes]) => bytes[0] === 0x90)).toHaveLength(1)
      expect(fake.port.send.mock.calls.at(-1)).toEqual([[0x80, 60, 0], afterClear])
      expect(fake.queue.getSnapshot().notes).toEqual([])
    }
  )

  it('does not replay a retained uncertain attack, but secures its cleared release', () => {
    const fake = setup()
    fake.queue.enqueue(intent('cancel', { midi: 65, onTimeMs: 2000, offTimeMs: 3000 }))
    fake.queue.enqueue(
      intent('retain', {
        channel: 2,
        track: 'chord',
        source: { kind: 'chord', chordId: 'C', midi: 60 },
        onTimeMs: 1002,
        offTimeMs: 1020
      })
    )
    fake.queue.pump()
    fake.queue.cancel({ track: 'lead' })
    expect(fake.port.send.mock.calls.filter(([bytes]) => bytes[0] === 0x91)).toHaveLength(1)
    fake.advance(1040)
    expect(fake.delivered.map((event) => event.bytes)).toEqual([[0x81, 60, 0]])
  })

  it('reissues an uncertain cleared boundary Off and leaves the active other note untouched', () => {
    const fake = setup()
    fake.queue.enqueue(intent('short', { onTimeMs: 1000, offTimeMs: 1010 }))
    fake.queue.enqueue(intent('cancel', { midi: 64, onTimeMs: 2000, offTimeMs: 3000 }))
    fake.queue.pump()
    fake.advance(1009, false)
    fake.queue.cancel({ source: { kind: 'melody', noteId: 'cancel' } })
    fake.advance(1030)
    expect(fake.delivered.map((event) => event.bytes)).toEqual([
      [0x90, 60, 100],
      [0x80, 60, 0]
    ])
  })

  it('releases before equal-time retriggers and removes the previous long off', () => {
    const fake = setup()
    fake.queue.enqueue(intent('old', { onTimeMs: 1000, offTimeMs: 3000 }))
    fake.queue.pump()
    fake.queue.enqueue(intent('new', { onTimeMs: 1010, offTimeMs: 1040 }))
    fake.queue.pump()
    fake.advance(1030)
    fake.advance(4000)
    expect(fake.delivered.map((event) => [event.bytes, event.timeMs])).toEqual([
      [[0x90, 60, 100], 1000],
      [[0x80, 60, 0], 1010],
      [[0x90, 60, 100], 1010],
      [[0x80, 60, 0], 1040]
    ])
  })

  it('clears an already submitted old Off when pulling it forward for retrigger', () => {
    const fake = setup()
    fake.queue.enqueue(intent('old', { onTimeMs: 1000, offTimeMs: 1025 }))
    fake.queue.pump()
    fake.queue.enqueue(intent('new', { onTimeMs: 1010, offTimeMs: 1050 }))
    fake.advance(1030)
    fake.advance(1060)
    expect(fake.port.clear).toHaveBeenCalledOnce()
    expect(fake.delivered.map((event) => [event.bytes, event.timeMs])).toEqual([
      [[0x90, 60, 100], 1000],
      [[0x80, 60, 0], 1010],
      [[0x90, 60, 100], 1010],
      [[0x80, 60, 0], 1050]
    ])
  })

  it('reorders submitted future Ons after an out-of-order earlier gate is inserted', () => {
    const fake = setup()
    fake.queue.enqueue(intent('later', { onTimeMs: 1020, offTimeMs: 1060 }))
    fake.queue.pump()
    fake.queue.enqueue(intent('earlier', { onTimeMs: 1010, offTimeMs: 1040 }))
    fake.advance(1030)
    fake.advance(1070)
    expect(fake.delivered.map((event) => [event.bytes, event.timeMs])).toEqual([
      [[0x90, 60, 100], 1010],
      [[0x80, 60, 0], 1020],
      [[0x90, 60, 100], 1020],
      [[0x80, 60, 0], 1060]
    ])
  })

  it('drops very late and already expired attacks but immediately closes late releases', () => {
    const fake = setup()
    fake.queue.enqueue(intent('held', { onTimeMs: 1000, offTimeMs: 1050 }))
    fake.queue.pump()
    fake.queue.enqueue(intent('late', { midi: 64, onTimeMs: 1000, offTimeMs: 3000 }))
    fake.queue.enqueue(intent('expired', { midi: 67, onTimeMs: 1050, offTimeMs: 1051 }))
    fake.advance(1200)
    expect(fake.delivered.map((event) => [event.bytes, event.timeMs])).toEqual([
      [[0x90, 60, 100], 1000],
      [[0x80, 60, 0], 1200]
    ])
    fake.advance(1210)
    expect(fake.queue.getSnapshot().notes).toEqual([])
  })

  it('mutes a single source while preserving another active source through generation reconcile', () => {
    const fake = setup()
    fake.queue.enqueue(intent('mute', { onTimeMs: 1000, offTimeMs: 3000 }))
    fake.queue.enqueue(intent('keep', { midi: 64, onTimeMs: 1000, offTimeMs: 4000 }))
    fake.queue.enqueue(intent('future', { midi: 67, onTimeMs: 2000, offTimeMs: 3000 }))
    fake.queue.pump()
    fake.queue.reconcile({ track: 'lead', generation: 1 }, [{ kind: 'melody', noteId: 'keep' }])
    expect(fake.queue.getSnapshot().notes.map(({ note }) => note.eventId)).toEqual(['keep'])
    expect(fake.delivered.map((event) => event.bytes)).toEqual([
      [0x90, 60, 100],
      [0x90, 64, 100],
      [0x80, 60, 0]
    ])
    fake.advance(3980)
    fake.advance(4010)
    expect(fake.delivered.at(-1)?.bytes).toEqual([0x80, 64, 0])
  })

  it.each(['suspend', 'reanchor'])(
    'cleans pending and possible notes on clock %s without catching up on resume',
    (reason) => {
      const fake = setup()
      fake.queue.enqueue(intent('held', { onTimeMs: 1000, offTimeMs: 3000 }))
      fake.queue.enqueue(intent('future', { midi: 64, onTimeMs: 2000, offTimeMs: 3000 }))
      fake.queue.pump()
      if (reason === 'suspend') fake.running = false
      else ++fake.epoch
      fake.queue.pump()
      fake.running = true
      fake.advance(4000)
      expect(fake.delivered.map((event) => event.bytes)).toEqual([
        [0x90, 60, 100],
        [0x80, 60, 0]
      ])
    }
  )

  it('panic and disposal release owned notes and controllers only on used channels', () => {
    const fake = setup()
    fake.queue.enqueue(intent('active', { channel: 2, onTimeMs: 1000, offTimeMs: 3000 }))
    fake.queue.pump()
    fake.queue.dispose()
    fake.queue.dispose()
    expect(fake.delivered.map((event) => event.bytes)).toEqual([
      [0x91, 60, 100],
      [0x81, 60, 0],
      [0xb1, 64, 0],
      [0xb1, 123, 0],
      [0xb1, 120, 0]
    ])
    expect(fake.stopped).toBe(1)
    expect(() => fake.queue.enqueue(intent('after'))).toThrow('unavailable')
  })

  it('stops scheduling after send failure and continues best-effort disposal', () => {
    const fake = setup()
    fake.queue.enqueue(intent('active', { onTimeMs: 1000, offTimeMs: 3000 }))
    fake.port.send.mockImplementation(() => {
      throw new Error('Disconnected')
    })
    fake.callback?.()
    expect(fake.queue.getSnapshot()).toMatchObject({ failed: true, notes: [] })
    expect(() => fake.queue.dispose()).not.toThrow()
  })

  it('does not let canceling a completed predecessor cut its new same-pitch voice', () => {
    const fake = setup()
    fake.queue.enqueue(intent('old', { onTimeMs: 1000, offTimeMs: 3000 }))
    fake.queue.pump()
    fake.queue.enqueue(intent('new', { onTimeMs: 1010, offTimeMs: 1040 }))
    fake.queue.pump()
    fake.advance(1011, false)
    fake.queue.cancel({ source: { kind: 'melody', noteId: 'old' } })
    expect(fake.delivered.map((event) => [event.bytes, event.timeMs])).toEqual([
      [[0x90, 60, 100], 1000],
      [[0x80, 60, 0], 1010],
      [[0x90, 60, 100], 1010]
    ])
    fake.advance(1030)
    fake.advance(1050)
    expect(fake.delivered.at(-1)).toMatchObject({ bytes: [0x80, 60, 0], timeMs: 1040 })
    expect(fake.queue.getSnapshot().notes).toEqual([])
  })

  it('fails closed and compensates future submitted attacks when clear itself fails', () => {
    const fake = setup()
    fake.queue.enqueue(intent('future', { offTimeMs: 3000 }))
    fake.queue.pump()
    fake.port.clear.mockImplementation(() => {
      throw new Error('Clear failed')
    })
    expect(() => fake.queue.cancel({ track: 'lead' })).toThrow('Clear failed')
    expect(fake.queue.getSnapshot()).toMatchObject({ failed: true, notes: [] })
    expect(() => fake.queue.enqueue(intent('after-failure'))).toThrow('unavailable')
    fake.advance(1020)
    expect(fake.delivered.filter((event) => event.timeMs === 1010).map((event) => event.bytes)).toEqual([
      [0x90, 60, 100],
      [0x80, 60, 0]
    ])
  })

  it('rejects competing clocks and timing policies for an already-owned port', () => {
    const fake = setup()
    expect(() => MidiPortQueue.own(fake.port, { ...fake.environment, clockOwner: {} }, TEST_QUEUE_TIMING)).toThrow(
      'same clock owner'
    )
    expect(() => MidiPortQueue.own(fake.port, fake.environment, { ...TEST_QUEUE_TIMING, cancelGuardMs: 3 })).toThrow(
      'timing policy'
    )
    expect(fake.port.send).not.toHaveBeenCalled()
  })

  it('keeps a cleanup Off obligation across two immediate port clears', () => {
    const fake = setup()
    fake.queue.enqueue(intent('first', { onTimeMs: 1000, offTimeMs: 3000 }))
    fake.queue.enqueue(intent('second', { midi: 64, onTimeMs: 1000, offTimeMs: 3000 }))
    fake.queue.pump()
    // Model a driver which has not emitted immediate releases when the next clear arrives.
    fake.port.send.mockImplementation((bytes, timeMs) =>
      fake.pending.push({ bytes: [...bytes], timeMs, order: fake.pending.length })
    )
    fake.port.clear.mockImplementation(() => {
      fake.pending = []
    })
    fake.queue.cancel({ source: { kind: 'melody', noteId: 'first' } })
    fake.queue.cancel({ source: { kind: 'melody', noteId: 'second' } })
    fake.flush()
    expect(fake.delivered.filter((event) => (event.bytes[0]! & 0xf0) === 0x80).map((event) => event.bytes)).toEqual([
      [0x80, 64, 0],
      [0x80, 60, 0]
    ])
    fake.advance(1010)
    expect(fake.queue.getSnapshot().releaseObligations).toEqual([])
  })

  it('retains a late Off until its actual submitted time clears the race guard', () => {
    const fake = setup()
    fake.queue.enqueue(intent('late-off', { onTimeMs: 1000, offTimeMs: 1050 }))
    fake.queue.enqueue(intent('other', { midi: 64, onTimeMs: 2000, offTimeMs: 3000 }))
    fake.queue.pump()
    fake.port.send.mockImplementation((bytes, timeMs) =>
      fake.pending.push({ bytes: [...bytes], timeMs, order: fake.pending.length })
    )
    fake.nowMs = 1200
    fake.queue.pump()
    fake.queue.pump()
    fake.port.clear.mockImplementation(() => {
      fake.pending = []
    })
    fake.queue.cancel({ source: { kind: 'melody', noteId: 'other' } })
    fake.flush()
    expect(fake.delivered.at(-1)).toMatchObject({ bytes: [0x80, 60, 0], timeMs: 1200 })
  })

  it('preserves panic cleanup through a guarded owner replacement', () => {
    const fake = setup()
    fake.queue.enqueue(intent('active', { onTimeMs: 1000, offTimeMs: 3000 }))
    fake.queue.pump()
    fake.port.send.mockImplementation((bytes, timeMs) =>
      fake.pending.push({ bytes: [...bytes], timeMs, order: fake.pending.length })
    )
    fake.port.clear.mockImplementation(() => {
      fake.pending = []
    })
    fake.queue.dispose()
    fake.queue = MidiPortQueue.own(fake.port, fake.environment, TEST_QUEUE_TIMING)
    expect(() => fake.queue.enqueue(intent('too-early'))).toThrow('panic cleanup')
    fake.queue.cancel({})
    fake.queue.cancel({})
    fake.queue.cancel({})
    fake.flush()
    expect(fake.delivered.map((event) => event.bytes)).toEqual([
      [0x90, 60, 100],
      [0x80, 60, 0],
      [0xb0, 64, 0],
      [0xb0, 123, 0],
      [0xb0, 120, 0]
    ])
    fake.advance(1010)
    expect(() => fake.queue.enqueue(intent('new', { onTimeMs: 1020, offTimeMs: 1040 }))).not.toThrow()
  })

  it('rejects unsafe ports, timing budgets and conflicting ownership', () => {
    const fake = setup()
    const missingClear = new PortFake('unsafe')
    Object.assign(missingClear, { clear: undefined })
    expect(() => MidiPortQueue.own(missingClear, fake.environment)).toThrow('clear()')
    expect(() => new QueueFake({ ...TEST_QUEUE_TIMING, horizonMs: 1 })).toThrow('budget')
    fake.queue.enqueue(intent('lead'))
    expect(() =>
      fake.queue.enqueue(intent('chord', { track: 'chord', source: { kind: 'chord', chordId: 'C', midi: 60 } }))
    ).toThrow('different')
    expect(() => fake.queue.enqueue(intent('lead'))).toThrow('duplicate')
    expect(DEFAULT_MIDI_QUEUE_TIMING.horizonMs).toBeGreaterThanOrEqual(
      DEFAULT_MIDI_QUEUE_TIMING.pumpIntervalMs + DEFAULT_MIDI_QUEUE_TIMING.cancelGuardMs
    )
  })
})
