import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_MIDI_OUTPUT_SETTINGS } from '../../../src/config/defaults'
import { MidiAccessManager } from '../../../src/audio/midi/access-manager'
import { MidiClockBridge } from '../../../src/audio/midi/clock-bridge'
import { cancelMidiPortScope } from '../../../src/audio/midi/port-queue'
import { MidiTransportOutput } from '../../../src/audio/midi/transport-output'
import type { MidiTrackKey, MidiTrackRoute } from '../../../src/core/midi/output.types'
import type { OutputClockSample } from '../../../src/core/transport/output-timing'
import { TEST_QUEUE_TIMING } from './queue-fake'
import { AccessFake, deferred, PortFake } from './port-fake'

const runtimes: MidiTransportOutput[] = []
const managers: MidiAccessManager[] = []

function fixture(...ports: PortFake[]) {
  const access = new AccessFake(...ports)
  const manager = new MidiAccessManager({ secureContext: true, requestAccess: async () => access })
  manager.setCleanupHook(({ port, track }) => {
    cancelMidiPortScope(port, { track })
  })
  const time: {
    audioSeconds: number
    performanceOffsetMs: number
    running: boolean
    outputTimestamp?: OutputClockSample
  } = { audioSeconds: 1, performanceOffsetMs: 0, running: true }
  const clock = new MidiClockBridge({
    read: () => ({
      contextTimeSeconds: time.audioSeconds,
      performanceTimeMs: 1000 + time.audioSeconds * 1000 + time.performanceOffsetMs,
      running: time.running,
      outputTimestamp: time.outputTimestamp
    }),
    signalPathLatencySeconds: () => 0
  })
  const callbacks: Array<() => void> = []
  const output = new MidiTransportOutput(
    manager,
    clock,
    () => 0.1,
    TEST_QUEUE_TIMING,
    (callback) => {
      callbacks.push(callback)
      return () => {
        const index = callbacks.indexOf(callback)
        if (index >= 0) callbacks.splice(index, 1)
      }
    }
  )
  managers.push(manager)
  runtimes.push(output)
  return {
    access,
    manager,
    output,
    callbacks,
    time,
    async enable() {
      await manager.enable()
    }
  }
}

function route(port: PortFake, channel: number, offsetMs = 0): MidiTrackRoute {
  return {
    ...DEFAULT_MIDI_OUTPUT_SETTINGS.lead,
    mode: 'midi',
    port: { id: port.id, name: port.name, manufacturer: port.manufacturer },
    channel,
    offsetMs
  }
}

function note(track: MidiTrackKey, eventId: string, channel: number, offTimeSeconds = 4) {
  return {
    track,
    source:
      track === 'lead'
        ? ({ kind: 'melody', noteId: eventId } as const)
        : ({ kind: 'chord', chordId: eventId, midi: 67 } as const),
    sessionId: 'transport',
    generation: 1,
    loopIteration: 0,
    eventId,
    channel,
    midi: track === 'lead' ? 60 : 67,
    velocity: 100,
    onTimeSeconds: 1.01,
    offTimeSeconds,
    routeOffsetMs: 0
  }
}

async function routeAndResume(
  output: MidiTransportOutput,
  track: MidiTrackKey,
  port: PortFake,
  channel: number,
  offsetMs = 0
) {
  expect(await output.setRoute(track, route(port, channel, offsetMs))).toBe(true)
  await output.resume()
  expect(output.canDispatch(track)).toBe(true)
}

afterEach(async () => {
  for (const output of runtimes.splice(0)) output.dispose()
  for (const manager of managers.splice(0)) await manager.dispose()
})

describe('transport MIDI output lifecycle', () => {
  it('keeps a port without clear playing through initial and temporarily missing output calibration', async () => {
    const port = new PortFake()
    Object.assign(port, { clear: undefined })
    const { output, callbacks, time, enable } = fixture(port)
    await enable()
    await routeAndResume(output, 'lead', port, 1)
    output.midi.enqueue(note('lead', 'first', 1))
    time.audioSeconds = 1.01
    for (const callback of [...callbacks]) callback()
    expect(port.send.mock.calls.map(([bytes]) => bytes)).toEqual([[0x90, 60, 100]])

    time.audioSeconds = 1.02
    time.outputTimestamp = { contextTimeSeconds: 1, performanceTimeMs: 2010 }
    for (const callback of [...callbacks]) callback()
    expect(output.canDispatch('lead')).toBe(true)

    time.audioSeconds = 1.03
    time.outputTimestamp = undefined
    for (const callback of [...callbacks]) callback()
    expect(output.canDispatch('lead')).toBe(true)
    expect(port.send.mock.calls.map(([bytes]) => bytes)).toEqual([[0x90, 60, 100]])

    time.outputTimestamp = { contextTimeSeconds: 1.01, performanceTimeMs: 2020 }
    output.midi.enqueue({ ...note('lead', 'second', 1, 1.1), midi: 62, onTimeSeconds: 1.04 })
    time.audioSeconds = 1.06
    for (const callback of [...callbacks]) callback()
    expect(port.send.mock.calls.map(([bytes]) => bytes)).toEqual([
      [0x90, 60, 100],
      [0x90, 62, 100]
    ])
    time.audioSeconds = 1.12
    for (const callback of [...callbacks]) callback()
    expect(port.send.mock.calls.at(-1)?.[0]).toEqual([0x80, 62, 0])
    expect(output.canDispatch('lead')).toBe(true)
  })

  it.each(['missing', 'ambiguous', 'exact'] as const)(
    'restores a %s desired port by ID only and waits for explicit enable/resume',
    async (match) => {
      const first = new PortFake('first')
      const second = new PortFake('second')
      const ports = match === 'missing' ? [] : [first, second]
      const { output, manager, enable } = fixture(...ports)
      const desired = {
        ...structuredClone(DEFAULT_MIDI_OUTPUT_SETTINGS),
        lead: {
          ...route(first, 5, -8),
          port: { id: match === 'exact' ? first.id : 'retired-id', name: first.name, manufacturer: first.manufacturer },
          sendPreviews: true
        }
      }
      output.restoreSettings(desired)
      expect(output.getSettings()).toEqual(desired)
      expect(manager.getSnapshot().enabled).toBe(false)
      expect(output.canDispatch('lead')).toBe(false)
      expect(first.open).not.toHaveBeenCalled()
      await enable()
      expect(manager.getSnapshot().routes.lead).toMatchObject({
        desiredPortId: desired.lead.port.id,
        activePortId: null,
        status: match === 'exact' ? 'available' : 'disconnected'
      })
      expect(first.open).not.toHaveBeenCalled()
      expect(second.open).not.toHaveBeenCalled()
      expect(first.send).not.toHaveBeenCalled()
      await output.resume()
      expect(output.canDispatch('lead')).toBe(match === 'exact')
      expect(output.getSettings()).toEqual(desired)
      expect(second.open).not.toHaveBeenCalled()
      if (match !== 'exact') expect(first.open).not.toHaveBeenCalled()
    }
  )

  it('releases sounding notes before reset applies defaults and removes send authorization', async () => {
    const port = new PortFake()
    const { output, manager, callbacks, time, enable } = fixture(port)
    await enable()
    await routeAndResume(output, 'lead', port, 1)
    output.midi.enqueue(note('lead', 'reset-held', 1))
    time.audioSeconds = 1.02
    for (const callback of [...callbacks]) callback()
    const settingsAtRelease: unknown[] = []
    port.send.mockImplementation((bytes) => {
      if (bytes[0] === 0x80) settingsAtRelease.push(output.getSettings())
    })
    output.restoreSettings(DEFAULT_MIDI_OUTPUT_SETTINGS)
    expect(settingsAtRelease).toContainEqual({ ...DEFAULT_MIDI_OUTPUT_SETTINGS, lead: route(port, 1) })
    expect(output.getSettings()).toEqual(DEFAULT_MIDI_OUTPUT_SETTINGS)
    expect(manager.getSnapshot().enabled).toBe(false)
    expect(manager.getOpenOutput('lead')).toBeUndefined()
    expect(output.canDispatch('lead')).toBe(false)
    const sendsAfterReset = port.send.mock.calls.length
    time.audioSeconds = 5
    for (const callback of [...callbacks]) callback()
    expect(port.send.mock.calls.length).toBe(sendsAfterReset)
  })

  it('invalidates an in-flight route replacement when settings are reset', async () => {
    const port = new PortFake()
    port.openGate = deferred<void>()
    const { output, manager, enable } = fixture(port)
    await enable()
    const pending = output.setRoute('lead', route(port, 4))
    await vi.waitFor(() => expect(port.open).toHaveBeenCalledOnce())
    output.restoreSettings(DEFAULT_MIDI_OUTPUT_SETTINGS)
    port.openGate.resolve()
    expect(await pending).toBe(false)
    expect(output.getSettings()).toEqual(DEFAULT_MIDI_OUTPUT_SETTINGS)
    expect(manager.getOpenOutput('lead')).toBeUndefined()
    expect(output.canDispatch('lead')).toBe(false)
  })

  it('atomically updates channel and offset on a shared port while preserving the other track Off', async () => {
    const port = new PortFake()
    const { output, enable, callbacks, time } = fixture(port)
    await enable()
    await routeAndResume(output, 'lead', port, 1)
    await routeAndResume(output, 'chord', port, 2)
    output.midi.enqueue(note('lead', 'lead-held', 1))
    output.midi.enqueue(note('chord', 'chord-held', 2))
    time.audioSeconds = 1.02
    for (const callback of [...callbacks]) callback()

    expect(await output.setRoute('lead', route(port, 3, 5))).toBe(true)
    expect(output.getSettings().lead).toMatchObject({ channel: 3, offsetMs: 5 })
    expect(output.canDispatch('lead')).toBe(true)
    expect(output.canDispatch('chord')).toBe(true)
    expect(port.send.mock.calls.map(([bytes]) => bytes)).toContainEqual([0x80, 60, 0])
    expect(port.send.mock.calls.map(([bytes]) => bytes)).toContainEqual([0x91, 67, 100])

    time.audioSeconds = 3.99
    for (const callback of [...callbacks]) callback()
    const chordOffs = port.send.mock.calls.filter(([bytes]) => bytes[0] === 0x81 && bytes[1] === 67)
    expect(chordOffs.length).toBeGreaterThanOrEqual(1)
  })

  it('preserves a shared-port sibling note and Off when the other route closes', async () => {
    const port = new PortFake()
    const { output, enable, callbacks, time } = fixture(port)
    await enable()
    await routeAndResume(output, 'lead', port, 1)
    await routeAndResume(output, 'chord', port, 2)
    output.midi.enqueue(note('lead', 'lead-retained', 1))
    output.midi.enqueue(note('chord', 'chord-canceled', 2))
    time.audioSeconds = 1.02
    for (const callback of [...callbacks]) callback()

    expect(await output.setRoute('chord', { ...DEFAULT_MIDI_OUTPUT_SETTINGS.chord })).toBe(true)
    expect(output.canDispatch('lead')).toBe(true)
    expect(output.canDispatch('chord')).toBe(false)
    expect(port.close).not.toHaveBeenCalled()
    expect(port.send.mock.calls.map(([bytes]) => bytes)).toContainEqual([0x81, 67, 0])

    time.audioSeconds = 3.99
    for (const callback of [...callbacks]) callback()
    expect(port.send.mock.calls.map(([bytes]) => bytes)).toContainEqual([0x80, 60, 0])
  })

  it('keeps old route settings and output when a replacement port cannot open', async () => {
    const active = new PortFake('active')
    const failed = new PortFake('failed')
    failed.failOpen = true
    const { output, manager, enable } = fixture(active, failed)
    await enable()
    await routeAndResume(output, 'lead', active, 1)
    const oldSettings = output.getSettings()

    expect(await output.setRoute('lead', route(failed, 4, 3))).toBe(false)
    expect(output.getSettings()).toEqual(oldSettings)
    expect(output.canDispatch('lead')).toBe(true)
    expect(manager.getOpenOutput('lead')).toBe(active)
    expect(active.connection).toBe('open')
  })

  it('opens a replacement port before cleaning and replacing the active route', async () => {
    const active = new PortFake('active')
    const replacement = new PortFake('replacement')
    const { output, manager, enable } = fixture(active, replacement)
    const order: string[] = []
    manager.setCleanupHook(({ port, reason }) => {
      order.push(`${reason}:${port.id}:${replacement.connection}`)
    })
    await enable()
    await routeAndResume(output, 'lead', active, 1)
    order.length = 0

    expect(await output.setRoute('lead', route(replacement, 4, 2))).toBe(true)
    expect(order).toEqual([`switch:${active.id}:open`])
    expect(replacement.connection).toBe('open')
    expect(active.connection).toBe('closed')
    expect(output.getSettings().lead).toMatchObject({ port: { id: replacement.id }, channel: 4, offsetMs: 2 })
    expect(output.canDispatch('lead')).toBe(true)
    expect(manager.getOpenOutput('lead')).toBe(replacement)
  })

  it('serializes cross-track route changes and rejects a conflicting second channel before cleanup', async () => {
    const leadPort = new PortFake('lead-port')
    const chordPort = new PortFake('chord-port')
    const shared = new PortFake('shared')
    const { output, manager, enable } = fixture(leadPort, chordPort, shared)
    const cleaned: string[] = []
    manager.setCleanupHook(({ port, track }) => {
      cleaned.push(`${track}:${port.id}`)
    })
    await enable()
    await routeAndResume(output, 'lead', leadPort, 1)
    await routeAndResume(output, 'chord', chordPort, 2)
    const oldChordSettings = output.getSettings().chord
    cleaned.length = 0

    const leadChange = output.setRoute('lead', route(shared, 4))
    const chordChange = output.setRoute('chord', route(shared, 4))
    const [leadResult, chordResult] = await Promise.allSettled([leadChange, chordChange])

    expect(leadResult).toMatchObject({ status: 'fulfilled', value: true })
    expect(chordResult.status).toBe('rejected')
    expect(output.getSettings().lead).toMatchObject({ port: { id: shared.id }, channel: 4 })
    expect(output.getSettings().chord).toEqual(oldChordSettings)
    expect(manager.getOpenOutput('chord')).toBe(chordPort)
    expect(cleaned).not.toContain(`chord:${chordPort.id}`)
  })

  it.each(['panic', 'disable'] as const)(
    '%s during a pending port open cannot reactivate the stale candidate',
    async (action) => {
      const port = new PortFake()
      port.openGate = deferred<void>()
      const { output, manager, enable } = fixture(port)
      await enable()
      const opening = output.setRoute('lead', route(port, 1))
      await vi.waitFor(() => expect(port.open).toHaveBeenCalledOnce())
      if (action === 'panic') output.panic()
      const disabling = action === 'disable' ? manager.disable() : undefined
      port.openGate.resolve()

      expect(await opening).toBe(false)
      await disabling
      expect(output.canDispatch('lead')).toBe(false)
      expect(manager.getOpenOutput('lead')).toBeUndefined()
      expect(output.getSettings().lead.mode).toBe('internal')
    }
  )

  it('stops sends on disconnect and reconnects only after explicit resume without replay', async () => {
    const port = new PortFake()
    const { output, access, enable, callbacks, time } = fixture(port)
    await enable()
    await routeAndResume(output, 'lead', port, 1)
    output.midi.enqueue(note('lead', 'held', 1))
    time.audioSeconds = 1.02
    for (const callback of [...callbacks]) callback()
    expect(port.send.mock.calls.filter(([bytes]) => bytes[0] === 0x90 && bytes[1] === 60)).toHaveLength(1)
    const sendsBeforeDisconnect = port.send.mock.calls.length
    port.state = 'disconnected'
    port.connection = 'closed'
    access.outputs.delete(port.id)
    access.change()
    expect(output.canDispatch('lead')).toBe(false)
    access.change()
    expect(port.send.mock.calls.length).toBe(sendsBeforeDisconnect)

    const replacement = new PortFake(port.id)
    access.outputs.set(replacement.id, replacement)
    access.change()
    expect(output.canDispatch('lead')).toBe(false)
    expect(replacement.open).not.toHaveBeenCalled()
    await output.resume()
    expect(output.canDispatch('lead')).toBe(true)
    expect(replacement.send.mock.calls.map(([bytes]) => bytes)).toContainEqual([0x80, 60, 0])
    expect(replacement.send.mock.calls.map(([bytes]) => bytes)).not.toContainEqual([0x90, 60, 100])
  })

  it('suspends on clock timing loss and never auto-resumes or catches up old notes', async () => {
    const port = new PortFake()
    const { output, time, callbacks, enable } = fixture(port)
    await enable()
    await routeAndResume(output, 'lead', port, 1)
    output.midi.enqueue(note('lead', 'future', 1, 5))
    expect(callbacks.length).toBeGreaterThan(0)
    for (const callback of [...callbacks]) callback()
    expect(port.send.mock.calls.filter(([bytes]) => bytes[0] === 0x90 && bytes[1] === 60)).toHaveLength(1)

    time.running = false
    for (const callback of [...callbacks]) callback()
    expect(output.canDispatch('lead')).toBe(false)
    const sendsAfterLoss = port.send.mock.calls.length
    time.running = true
    for (const callback of [...callbacks]) callback()
    expect(output.canDispatch('lead')).toBe(false)
    expect(port.send.mock.calls.length).toBeLessThanOrEqual(sendsAfterLoss + 1)

    await output.resume()
    expect(output.canDispatch('lead')).toBe(true)
    expect(port.send.mock.calls.filter(([bytes]) => bytes[0] === 0x90 && bytes[1] === 60)).toHaveLength(1)
  })

  it('suspends on a performance clock jump independent of audio time until explicit resume', async () => {
    const port = new PortFake()
    const { output, callbacks, time, enable } = fixture(port)
    await enable()
    await routeAndResume(output, 'lead', port, 1)
    output.midi.enqueue(note('lead', 'clock-jump-held', 1, 5))
    time.audioSeconds = 1.02
    for (const callback of [...callbacks]) callback()
    expect(port.send.mock.calls.filter(([bytes]) => bytes[0] === 0x90 && bytes[1] === 60)).toHaveLength(1)

    const callsBeforeJump = port.send.mock.calls.length
    time.performanceOffsetMs = 100
    for (const callback of [...callbacks]) callback()
    expect(output.canDispatch('lead')).toBe(false)
    expect(port.send.mock.calls.slice(callsBeforeJump).map(([bytes]) => bytes)).toContainEqual([0x80, 60, 0])
    const callsAfterCleanup = port.send.mock.calls.length

    for (const callback of [...callbacks]) callback()
    expect(output.canDispatch('lead')).toBe(false)
    expect(port.send.mock.calls).toHaveLength(callsAfterCleanup)
    await output.resume()
    expect(output.canDispatch('lead')).toBe(true)
    expect(port.send.mock.calls.filter(([bytes]) => bytes[0] === 0x90 && bytes[1] === 60)).toHaveLength(1)
  })
})
