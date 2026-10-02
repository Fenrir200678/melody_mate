import { afterEach, describe, expect, it } from 'vitest'
import { MidiAccessManager } from '../../../src/audio/midi/access-manager'
import { MidiClockBridge } from '../../../src/audio/midi/clock-bridge'
import { MidiOutputSession } from '../../../src/audio/midi/output-session'
import type { AudioMidiNoteIntent } from '../../../src/audio/midi/output-session'
import { cancelMidiPortScope } from '../../../src/audio/midi/port-queue'
import { AccessFake } from './port-fake'
import { QueueFake, TEST_QUEUE_TIMING } from './queue-fake'

const cleanups: Array<() => void | Promise<void>> = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

async function setup() {
  const fake = new QueueFake()
  const access = new MidiAccessManager({ secureContext: true, requestAccess: async () => new AccessFake(fake.port) })
  access.setCleanupHook(({ port, track }) => cancelMidiPortScope(port, { track }))
  await access.enable()
  await access.open('lead', fake.port.id)
  await access.open('chord', fake.port.id)
  // The session installs the central owner's clock and wakeup; discard the harness's unused queue first.
  fake.queue.dispose()
  fake.port.send.mockClear()
  fake.port.clear.mockClear()
  const clock = new MidiClockBridge({
    read: () => ({ running: fake.running, contextTimeSeconds: fake.nowMs / 1000, performanceTimeMs: fake.nowMs }),
    signalPathLatencySeconds: () => 0.005
  })
  const create = (id: string) =>
    new MidiOutputSession(id, access, clock, () => 0.1, TEST_QUEUE_TIMING, fake.environment.wakeup)
  cleanups.push(() => access.dispose())
  return { fake, access, clock, create }
}

function audioIntent(eventId: string, overrides: Partial<AudioMidiNoteIntent> = {}): AudioMidiNoteIntent {
  return {
    eventId,
    track: 'lead',
    source: { kind: 'melody', noteId: eventId },
    sessionId: 'transport',
    generation: 1,
    loopIteration: 0,
    channel: 1,
    midi: 60,
    velocity: 100,
    onTimeSeconds: 1.01,
    offTimeSeconds: 3,
    routeOffsetMs: 0,
    ...overrides
  }
}

describe('MIDI output scheduling session infrastructure', () => {
  it('maps supplied audio times, enforces advance budget and leaves playback opt-in to later tasks', async () => {
    const { fake, create } = await setup()
    const session = create('transport')
    cleanups.push(() => session.dispose())
    expect(fake.port.send).not.toHaveBeenCalled()
    session.enqueue(audioIntent('one'))
    fake.callback?.()
    expect(fake.port.send.mock.calls).toEqual([[[0x90, 60, 100], 1015]])
    expect(() => session.enqueue(audioIntent('bad', { routeOffsetMs: -90 }))).toThrow('advance')
    expect(() => session.enqueue(audioIntent('other-session', { sessionId: 'preview' }))).toThrow('belong')
  })

  it('disposes one session without destroying another session on the same port', async () => {
    const { fake, create } = await setup()
    const transport = create('transport')
    const preview = create('preview')
    cleanups.push(
      () => transport.dispose(),
      () => preview.dispose()
    )
    transport.enqueue(audioIntent('melody', { onTimeSeconds: 1, offTimeSeconds: 3 }))
    preview.enqueue(
      audioIntent('other', {
        sessionId: 'preview',
        channel: 2,
        track: 'chord',
        source: { kind: 'chord', chordId: 'C', midi: 60 },
        onTimeSeconds: 1,
        offTimeSeconds: 4
      })
    )
    fake.nowMs = 1005
    fake.callback?.()
    transport.dispose()
    fake.nowMs = 3980
    fake.flush()
    fake.callback?.()
    fake.nowMs = 4020
    fake.flush()
    fake.callback?.()
    expect(fake.delivered.map((event) => event.bytes)).toEqual([
      [0x90, 60, 100],
      [0x91, 60, 100],
      [0x80, 60, 0],
      [0x81, 60, 0]
    ])
  })

  it('releases a closing track before the access manager closes its shared port lease', async () => {
    const { fake, access, create } = await setup()
    const session = create('transport')
    cleanups.push(() => session.dispose())
    session.enqueue(audioIntent('active', { onTimeSeconds: 1 }))
    fake.nowMs = 1005
    fake.callback?.()
    await access.close('lead')
    expect(fake.delivered.map((event) => event.bytes)).toEqual([
      [0x90, 60, 100],
      [0x80, 60, 0]
    ])
    expect(fake.port.close).not.toHaveBeenCalled()
    expect(access.getOpenOutput('chord')).toBe(fake.port)
  })

  it('releases on suspend and accepts only newly scheduled notes after resume', async () => {
    const { fake, create } = await setup()
    const session = create('transport')
    cleanups.push(() => session.dispose())
    session.enqueue(audioIntent('active', { onTimeSeconds: 1 }))
    fake.nowMs = 1005
    fake.callback?.()
    fake.running = false
    fake.callback?.()
    expect(() => session.enqueue(audioIntent('suspended'))).toThrow('not running')
    fake.nowMs = 1500
    fake.running = true
    session.enqueue(audioIntent('new', { onTimeSeconds: 1.51, offTimeSeconds: 1.6 }))
    fake.callback?.()
    fake.nowMs = 1620
    fake.flush()
    fake.callback?.()
    expect(fake.delivered.map((event) => event.bytes)).toEqual([
      [0x90, 60, 100],
      [0x80, 60, 0],
      [0x90, 60, 100],
      [0x80, 60, 0]
    ])
  })
})
