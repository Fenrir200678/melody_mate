import { afterEach, describe, expect, it, vi } from 'vitest'

const { toneMock, transport } = await vi.hoisted(async () => {
  const { createToneMock } = await import('../../helpers/tone-mock')
  const tone = createToneMock()
  return { toneMock: tone.toneMock, transport: tone.transport }
})
vi.mock('tone', () => toneMock)

import { DEFAULT_MIDI_OUTPUT_SETTINGS, DEFAULT_MIDI_TEST_NOTE } from '../../../src/config/defaults'
import { MidiAccessManager } from '../../../src/audio/midi/access-manager'
import { MidiClockBridge } from '../../../src/audio/midi/clock-bridge'
import { MidiPreviewOutput, type MidiPreviewEvent } from '../../../src/audio/midi/preview-output'
import { MidiOutputSession } from '../../../src/audio/midi/output-session'
import { cancelMidiPortScope } from '../../../src/audio/midi/port-queue'
import type { MidiOutputSettings } from '../../../src/core/midi/output.types'
import { AccessFake } from './port-fake'
import { intent, QueueFake, TEST_QUEUE_TIMING } from './queue-fake'

const cleanups: Array<() => void | Promise<void>> = []

afterEach(async () => {
  vi.useRealTimers()
  transport.state = 'stopped'
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

function event(overrides: Partial<MidiPreviewEvent> = {}): MidiPreviewEvent {
  return {
    midiNotes: [{ midi: 60, source: { kind: 'preview', sourceId: 'audition' } }],
    velocity: 0.8,
    onTimeSeconds: 1.02,
    durationSeconds: 0.1,
    ...overrides
  }
}

async function fixture(signalPathLatencySeconds = 0, supportsClear = true) {
  const fake = new QueueFake(TEST_QUEUE_TIMING, supportsClear)
  fake.nowMs = 1000
  const access = new MidiAccessManager({
    secureContext: true,
    requestAccess: async () => new AccessFake(fake.port)
  })
  access.setCleanupHook(({ port, track }) => cancelMidiPortScope(port, { track }))
  await access.enable()
  await access.open('lead', fake.port.id)
  await access.open('chord', fake.port.id)

  // The preview sessions use the bridge as the shared queue clock owner.
  fake.queue.dispose()
  fake.port.send.mockClear()
  fake.port.clear?.mockClear()

  const clock = new MidiClockBridge({
    read: () => ({
      contextTimeSeconds: fake.nowMs / 1000,
      performanceTimeMs: fake.nowMs,
      running: true
    }),
    signalPathLatencySeconds: () => signalPathLatencySeconds
  })
  const settings: MidiOutputSettings = structuredClone(DEFAULT_MIDI_OUTPUT_SETTINGS)
  for (const track of ['lead', 'chord'] as const) {
    settings[track] = {
      ...settings[track],
      mode: 'both',
      port: { id: fake.port.id, name: fake.port.name, manufacturer: fake.port.manufacturer },
      sendPreviews: false
    }
  }
  const preview = new MidiPreviewOutput(
    access,
    clock,
    () => settings,
    () => 0.1,
    TEST_QUEUE_TIMING,
    fake.environment.wakeup
  )
  cleanups.push(
    () => preview.dispose(),
    () => access.dispose()
  )
  toneMock.getContext.mockReturnValue({
    rawContext: { state: 'running', resume: vi.fn() },
    state: 'running',
    lookAhead: 0.1,
    updateInterval: 0.05,
    resume: vi.fn(),
    createAudioWorkletNode: vi.fn()
  } as unknown as ReturnType<typeof toneMock.getContext>)
  toneMock.now.mockReturnValue(1)
  toneMock.immediate.mockReturnValue(1)
  return { fake, access, clock, preview, settings }
}

function sendEvents(fake: QueueFake) {
  return fake.delivered.map((item) => ({ bytes: item.bytes, timeMs: item.timeMs }))
}

function advance(fake: QueueFake, timeMs: number) {
  fake.nowMs = timeMs
  fake.flush()
  fake.callback?.()
}

describe('MIDI preview output', () => {
  it('keeps the opt-in default off and sends the requested pitch and velocity when enabled', async () => {
    const { fake, preview, settings } = await fixture()
    expect(settings.lead.sendPreviews).toBe(DEFAULT_MIDI_OUTPUT_SETTINGS.lead.sendPreviews)
    expect(preview.start('note', 'lead', [event()]).ok).toBe(false)
    expect(fake.port.send).not.toHaveBeenCalled()

    settings.lead.sendPreviews = true
    expect(preview.start('note', 'lead', [event()])).toEqual({ ok: true, value: undefined })
    fake.callback?.()
    expect(fake.port.send).toHaveBeenCalledWith([0x90, 60, 102], 1020)
  })

  it('blocks previews during transport and cancels queued preview and test-note sessions when blocked', async () => {
    const { fake, preview, settings } = await fixture()
    settings.lead.sendPreviews = true
    expect(preview.start('notes', 'lead', [event({ onTimeSeconds: 1.2 })]).ok).toBe(true)
    preview.setTransportBlocked(true)
    advance(fake, 1220)
    expect(sendEvents(fake)).toEqual([])

    expect(preview.start('test', 'lead', [event()]).ok).toBe(false)
    expect(preview.testNote('lead').ok).toBe(false)
    preview.setTransportBlocked(false)
    transport.state = 'started'
    expect(preview.start('note', 'lead', [event()])).toEqual({
      ok: false,
      error: 'External previews are unavailable during transport playback.'
    })
    expect(preview.testNote('lead').ok).toBe(false)
    expect(fake.port.send).not.toHaveBeenCalled()

    transport.state = 'stopped'
    toneMock.now.mockReturnValue(1.24)
    expect(preview.testNote('lead').ok).toBe(true)
    fake.callback?.()
    preview.setTransportBlocked(true)
    advance(fake, 1300)
    expect(sendEvents(fake)).toEqual([])
  })

  it('keeps a future preview in the app queue until its send horizon reaches the event', async () => {
    const { fake, preview, settings } = await fixture()
    settings.lead.sendPreviews = true
    expect(preview.start('notes', 'lead', [event({ onTimeSeconds: 1.2 })]).ok).toBe(true)
    expect(fake.port.send).not.toHaveBeenCalled()
    advance(fake, 1170)
    expect(fake.port.send).toHaveBeenCalledWith([0x90, 60, 102], 1200)
  })

  it('cancels a same-pitch preview without losing the transport session release on a shared port', async () => {
    const { fake, access, clock, preview, settings } = await fixture()
    settings.lead.sendPreviews = true
    const transportSession = new MidiOutputSession(
      'transport-test',
      access,
      clock,
      () => 0.1,
      TEST_QUEUE_TIMING,
      fake.environment.wakeup
    )
    cleanups.push(() => transportSession.dispose())
    transportSession.enqueue({
      ...intent('transport-same-pitch', {
        sessionId: 'transport-test',
        onTimeMs: 1010,
        offTimeMs: 1100,
        midi: 60
      }),
      onTimeSeconds: 1.01,
      offTimeSeconds: 1.1,
      routeOffsetMs: 0
    })
    expect(preview.start('note', 'lead', [event({ onTimeSeconds: 1.2 })]).ok).toBe(true)
    preview.cancel('note')
    advance(fake, 1100)
    expect(sendEvents(fake)).toEqual([
      { bytes: [0x90, 60, 100], timeMs: 1010 },
      { bytes: [0x80, 60, 0], timeMs: 1100 }
    ])
  })

  it.each([true, false])('sends a bounded test note with its configured release (clear: %s)', async (supportsClear) => {
    const { fake, preview } = await fixture(0, supportsClear)
    toneMock.now.mockReturnValue(1.02)
    expect(preview.testNote('lead')).toEqual({ ok: true, value: undefined })
    advance(fake, supportsClear ? 1000 : 1020)
    expect(DEFAULT_MIDI_TEST_NOTE.durationSeconds).toBeGreaterThan(0)
    expect(fake.port.send).toHaveBeenCalledWith(
      [0x90, DEFAULT_MIDI_TEST_NOTE.midi, Math.round(DEFAULT_MIDI_TEST_NOTE.velocity * 127)],
      1020
    )

    const offTimeMs = 1020 + DEFAULT_MIDI_TEST_NOTE.durationSeconds * 1000
    advance(fake, offTimeMs - (supportsClear ? TEST_QUEUE_TIMING.horizonMs : 0))
    expect(fake.port.send).toHaveBeenLastCalledWith([0x80, DEFAULT_MIDI_TEST_NOTE.midi, 0], offTimeMs)
  })

  it('finishes on the mapped MIDI off time including route offset and signal-path latency', async () => {
    vi.useFakeTimers()
    const { fake, preview, settings } = await fixture(0.02)
    settings.lead.sendPreviews = true
    settings.lead.offsetMs = 20
    expect(preview.start('note', 'lead', [event()]).ok).toBe(true)
    advance(fake, 1030)
    advance(fake, 1060)
    expect(fake.delivered.at(-1)?.bytes).toEqual([0x90, 60, 102])
    vi.advanceTimersByTime(140)
    expect(fake.port.send.mock.calls.some(([bytes]) => bytes[0] === 0x80)).toBe(false)
    advance(fake, 1130)
    expect(fake.port.send).toHaveBeenLastCalledWith([0x80, 60, 0], 1160)
    advance(fake, 1160)
    vi.advanceTimersByTime(30)
    expect(fake.delivered.at(-1)?.bytes).toEqual([0x80, 60, 0])
    const count = fake.port.send.mock.calls.length
    preview.cancel('note')
    expect(fake.port.send).toHaveBeenCalledTimes(count)
  })

  it('rejects an unavailable route and reports a bounded-send setup error', async () => {
    const { fake, access, preview } = await fixture()
    await access.close('lead')
    toneMock.now.mockReturnValue(1.02)
    expect(preview.testNote('lead')).toEqual({ ok: false, error: 'MIDI preview route is unavailable.' })
    expect(fake.port.send).not.toHaveBeenCalled()
  })

  it('blocks test note explicitly when its selected track has no open output', async () => {
    const fake = new QueueFake()
    fake.nowMs = 1000
    const access = new MidiAccessManager({ secureContext: true, requestAccess: async () => new AccessFake() })
    await access.enable()
    const clock = new MidiClockBridge({
      read: () => ({ contextTimeSeconds: 1, performanceTimeMs: 1000, running: true }),
      signalPathLatencySeconds: () => 0
    })
    const preview = new MidiPreviewOutput(
      access,
      clock,
      () => structuredClone(DEFAULT_MIDI_OUTPUT_SETTINGS),
      () => 0.1
    )
    cleanups.push(
      () => preview.dispose(),
      () => access.dispose(),
      () => fake.queue.dispose()
    )
    expect(preview.testNote('lead')).toEqual({ ok: false, error: 'MIDI preview route is unavailable.' })
  })
})
