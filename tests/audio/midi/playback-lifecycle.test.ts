import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, disposePinia, setActivePinia } from 'pinia'

const { mock, toneMock } = await vi.hoisted(async () => {
  const { createToneMock } = await import('../../helpers/tone-mock')
  const mock = createToneMock()
  return { mock, toneMock: mock.toneMock }
})
vi.mock('tone', () => toneMock)

import * as trainedModelService from '../../../src/services/trained-model-service'
import { PreviewController } from '../../../src/audio/playback-engine/preview-controller'
import { PlaybackEngine } from '../../../src/audio/playback-engine'
import { MidiAccessManager } from '../../../src/audio/midi/access-manager'
import { MidiClockBridge } from '../../../src/audio/midi/clock-bridge'
import { MidiTransportOutput } from '../../../src/audio/midi/transport-output'
import { cancelMidiPortScope, disconnectMidiPort } from '../../../src/audio/midi/port-queue'
import { DEFAULT_MIDI_OUTPUT_SETTINGS, DEFAULT_MIDI_QUEUE_TIMING } from '../../../src/config/defaults'
import { ProjectSchema, PROJECT_SCHEMA_VERSION } from '../../../src/core/schemas/project.schema'
import type { AppNote } from '../../../src/core/schemas/note.schema'
import type { ChordEvent } from '../../../src/core/schemas/chord.schema'
import { useAudioStore } from '../../../src/stores/audio.store'
import { useMelodyStore } from '../../../src/stores/melody.store'
import { useHarmonyStore } from '../../../src/stores/harmony.store'
import { useMidiOutputStore } from '../../../src/stores/midi-output.store'
import { useProjectStore } from '../../../src/stores/project.store'
import { useAudioSettingsStore } from '../../../src/stores/audio-settings.store'
import { useUiStore } from '../../../src/stores/ui.store'
import { useTakesStore } from '../../../src/stores/takes.store'
import { useMixerStore } from '../../../src/stores/mixer.store'
import { AccessFake, deferred } from './port-fake'
import { QueueFake, TEST_QUEUE_TIMING } from './queue-fake'

const config = ProjectSchema.parse({ version: PROJECT_SCHEMA_VERSION, bpm: 120, bars: 4, isLooping: false })
const note: AppNote = { id: 'one', midi: 60, pitch: 'C4', step: 0, durationSteps: 8, velocity: 100, isMuted: false }
const chord: ChordEvent = {
  id: 'chord',
  name: 'C',
  roman: 'I',
  notes: ['G3'],
  voicing: ['G3'],
  startBar: 0,
  durationBars: 1
}
const cleanups: (() => void | Promise<void>)[] = []
let pinia: ReturnType<typeof createPinia>
let page: EventTarget
let contextListeners: Set<() => void>
let loopListeners: Set<(time: number) => void>
let context: ReturnType<typeof toneMock.getContext>

function callbacks() {
  const calls = mock.mockTransportSchedule.mock.calls as unknown as [(time: number) => void, string][]
  return calls.map(([callback]) => callback)
}

async function fixture() {
  const fake = new QueueFake()
  fake.queue.dispose()
  const ports = new AccessFake(fake.port)
  const access = new MidiAccessManager({ secureContext: true, requestAccess: async () => ports })
  access.setCleanupHook(({ port, track, reason }) => {
    if (reason === 'disconnect') disconnectMidiPort(port)
    else cancelMidiPortScope(port, { track })
  })
  await access.enable()
  const clock = new MidiClockBridge({
    read: () => ({ running: fake.running, contextTimeSeconds: fake.nowMs / 1000, performanceTimeMs: fake.nowMs }),
    signalPathLatencySeconds: () => 0
  })
  const runtime = new MidiTransportOutput(access, clock, () => 0.1, TEST_QUEUE_TIMING, fake.environment.wakeup)
  for (const track of ['lead', 'chord'] as const)
    await runtime.setRoute(track, {
      ...DEFAULT_MIDI_OUTPUT_SETTINGS[track],
      mode: 'both',
      port: { id: fake.port.id, name: null, manufacturer: null }
    })
  const harmony = useHarmonyStore()
  const engine = new PlaybackEngine(undefined, runtime, () => harmony.useChords && !harmony.isMuted)
  useAudioStore().setPlaybackEngine(engine)
  await engine.play()
  mock.transport.state = 'started'
  const advance = (timeMs: number) => {
    fake.nowMs = timeMs
    fake.flush()
    toneMock.immediate.mockReturnValue(timeMs / 1000)
    toneMock.now.mockReturnValue(timeMs / 1000 + 0.1)
    fake.callback?.()
  }
  cleanups.push(
    () => access.dispose(),
    () => engine.dispose()
  )
  fake.port.send.mockClear()
  return { fake, ports, access, engine, runtime, advance }
}

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  page = new EventTarget()
  vi.stubGlobal('window', page)
  loopListeners = new Set()
  contextListeners = new Set()
  Object.assign(mock.transport, {
    on: vi.fn((_event, callback) => loopListeners.add(callback)),
    off: vi.fn((_event, callback) => loopListeners.delete(callback))
  })
  context = Object.assign(toneMock.getContext(), {
    state: 'running',
    lookAhead: 0.1,
    updateInterval: 0.02,
    on: vi.fn((_event, callback) => contextListeners.add(callback)),
    off: vi.fn((_event, callback) => contextListeners.delete(callback))
  })
  toneMock.getContext.mockReturnValue(context)
  toneMock.immediate.mockReturnValue(1)
  toneMock.now.mockReturnValue(1.1)
  mock.mockTransportSchedule.mockClear()
  mock.mockTransportClear.mockClear()
  mock.transport.start.mockClear()
  mock.transport.state = 'stopped'
  mock.MockPolySynth.instances = []
})

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
  disposePinia(pinia)
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('transport MIDI lifecycle production transitions', () => {
  it.each(['stop', 'pause', 'panic', 'clearScheduledEvents', 'dispose'] as const)(
    '%s ends active notes and blocks stale callbacks and queued attacks',
    async (action) => {
      const { engine, fake, advance } = await fixture()
      engine.schedule([note, { ...note, id: 'future', midi: 62, pitch: 'D4', step: 2 }], [], config)
      const stale = callbacks()
      stale[0](1.05)
      stale[1](1.075)
      advance(1025)
      advance(1060)
      engine[action]()
      const count = fake.port.send.mock.calls.length
      stale.forEach((callback) => callback(1.15))
      advance(2000)
      expect(fake.port.send).toHaveBeenCalledTimes(count)
      expect(fake.delivered.filter(({ bytes }) => (bytes[0]! & 0xf0) === 0x90).map(({ bytes }) => bytes[1])).toEqual([
        60
      ])
      expect(fake.delivered.some(({ bytes }) => bytes[0] === 0x80 && bytes[1] === 60)).toBe(true)
      if (action !== 'panic') expect(fake.delivered.some(({ bytes }) => (bytes[0]! & 0xf0) === 0xb0)).toBe(false)
    }
  )

  it('resamples after shared-port clear without replaying a sibling attack that became due', async () => {
    const { engine, fake, advance } = await fixture()
    engine.schedule([note], [chord], config)
    const [leadOn, chordOn] = callbacks()
    leadOn!(1.05)
    chordOn!(1.075)
    advance(1030)
    advance(1060)
    fake.clearAdvanceMs = 20
    useMixerStore().setMute('lead', true)
    expect(fake.delivered.filter(({ bytes }) => bytes[0] === 0x91)).toHaveLength(1)
    fake.clearAdvanceMs = 0
    advance(3050)
    advance(3080)
    expect(fake.delivered.filter(({ bytes }) => bytes[0] === 0x91)).toHaveLength(1)
    expect(fake.delivered.at(-1)?.bytes).toEqual([0x81, 55, 0])
  })

  it('seeks without chasing melody or admitting callbacks from the previous position', async () => {
    const { engine, fake, advance } = await fixture()
    engine.schedule([note], [], config)
    const stale = callbacks()[0]!
    stale(1.05)
    advance(1030)
    advance(1060)
    engine.seekToStep(18)
    expect(mock.transport.position).toBe('1:0:2')
    const count = fake.port.send.mock.calls.length
    stale(1.15)
    expect(fake.port.send).toHaveBeenCalledTimes(count)
    expect(fake.delivered.map(({ bytes }) => bytes)).toEqual([
      [0x90, 60, 100],
      [0x80, 60, 0]
    ])
  })

  it('retains unchanged active melody and sibling channel Offs through selected-note mute', async () => {
    const { engine, fake, advance } = await fixture()
    const melody = useMelodyStore()
    const harmony = useHarmonyStore()
    melody.setNotes([note, { ...note, id: 'two', midi: 62, pitch: 'D4' }])
    harmony.setChords([chord])
    useAudioStore().isPlaying = true
    engine.schedule(melody.notes, harmony.chords, config)
    callbacks()
      .slice(-3)
      .forEach((callback) => callback(1.05))
    advance(1030)
    advance(1060)
    melody.setSelectedNoteIds(['one'])
    melody.toggleSelectedMute()
    const offs = fake.delivered.filter(({ bytes }) => (bytes[0]! & 0xf0) === 0x80)
    expect(offs.map(({ bytes }) => [bytes[0], bytes[1]])).toEqual([[0x80, 60]])
    advance(2030)
    advance(2055)
    advance(3030)
    advance(3055)
    expect(
      fake.delivered.filter(({ bytes }) => (bytes[0]! & 0xf0) === 0x80).map(({ bytes }) => [bytes[0], bytes[1]])
    ).toEqual([
      [0x80, 60],
      [0x80, 62],
      [0x81, 55]
    ])
    expect(fake.delivered.some(({ bytes }) => (bytes[0]! & 0xf0) === 0xb0)).toBe(false)
  })

  it.each(['mute', 'solo', 'harmony'] as const)('releases only the excluded track on %s', async (action) => {
    const { engine, fake, advance } = await fixture()
    engine.schedule([note], [chord], config)
    callbacks().forEach((callback) => callback(1.05))
    advance(1030)
    advance(1060)
    const mixer = useMixerStore()
    if (action === 'mute') mixer.setMute('chord', true)
    if (action === 'solo') mixer.setSolo('lead', true)
    if (action === 'harmony') useHarmonyStore().setMuted(true)
    expect(fake.delivered.filter(({ bytes }) => (bytes[0]! & 0xf0) === 0x80).map(({ bytes }) => bytes)).toEqual([
      [0x81, 55, 0]
    ])
    advance(2030)
    advance(2055)
    expect(fake.delivered.at(-1)?.bytes).toEqual([0x80, 60, 0])
  })

  it('closes multiple loop iterations at the supplied future audio boundary, Off before retrigger', async () => {
    const { engine, fake, advance } = await fixture()
    engine.schedule([{ ...note, durationSteps: 32 }], [], { ...config, isLooping: true, loopEndStep: 8 })
    const on = callbacks()[0]!
    on(1.05)
    advance(1030)
    advance(1060)
    expect(loopListeners.size).toBe(1)
    for (const boundary of [2.05, 3.05]) {
      advance(boundary * 1000 - 70)
      for (const listener of loopListeners) listener(boundary)
      on(boundary)
      expect(fake.delivered.filter(({ bytes }) => bytes[0] === 0x80)).toHaveLength(boundary === 2.05 ? 0 : 1)
      advance(boundary * 1000 - 20)
      advance(boundary * 1000 + 5)
    }
    expect(fake.delivered.map(({ bytes }) => bytes[0])).toEqual([0x90, 0x80, 0x90, 0x80, 0x90])
    advance(3500)
    expect(fake.delivered.at(-1)?.bytes[0]).toBe(0x90)
    engine.dispose()
    expect(loopListeners.size).toBe(0)
    expect(contextListeners.size).toBe(0)
  })

  it.each(['pagehide', 'suspend'] as const)('%s releases and requires an explicit restart', async (boundary) => {
    const { engine, fake, advance } = await fixture()
    engine.schedule([note], [], config)
    const on = callbacks()[0]!
    on(1.05)
    advance(1030)
    advance(1060)
    if (boundary === 'pagehide') page.dispatchEvent(new Event('pagehide'))
    else {
      context.state = 'suspended'
      for (const listener of contextListeners) listener()
    }
    const count = fake.port.send.mock.calls.length
    context.state = 'running'
    on(1.15)
    expect(fake.port.send).toHaveBeenCalledTimes(count)
    expect(fake.delivered.at(-1)?.bytes).toEqual([0x80, 60, 0])
    await engine.play()
    on(1.15)
    advance(1130)
    advance(1160)
    expect(fake.delivered.at(-1)?.bytes).toEqual([0x90, 60, 100])
  })

  it('rebuilds BPM and groove generations while preserving internal tails and common Both durations', async () => {
    const { engine, fake, advance } = await fixture()
    const melody = useMelodyStore()
    const harmony = useHarmonyStore()
    const audio = useAudioStore()
    const project = useProjectStore()
    project.setBpm(config.bpm)
    project.setLooping(false)
    melody.setNotes([note])
    harmony.setChords([chord])
    audio.syncSchedule()
    const stale = callbacks().slice(-2)
    stale.forEach((callback) => callback(1.05))
    advance(1030)
    advance(1060)
    audio.isPlaying = true
    project.setBpm(60)
    audio.setBpm(project.bpm)
    expect(
      new Set(fake.delivered.filter(({ bytes }) => (bytes[0]! & 0xf0) === 0x80).map(({ bytes }) => bytes.join(',')))
    ).toEqual(new Set(['128,60,0', '129,55,0']))
    expect(engine.generations.getActiveVoiceCount('transport-lead')).toBe(1)
    const count = fake.port.send.mock.calls.length
    stale.forEach((callback) => callback(1.15))
    expect(fake.port.send).toHaveBeenCalledTimes(count)
    const enqueue = vi.spyOn(engine.outputRouter, 'dispatch')
    callbacks()
      .slice(-2)
      .forEach((callback) => callback(1.15))
    expect(enqueue.mock.calls.map(([event]) => event.durationSeconds)).toEqual([2, 4])
    advance(1130)
    advance(1160)
    const beforeGroove = fake.delivered.length
    project.setSwing(0.3)
    await Promise.resolve()
    expect(new Set(fake.delivered.slice(beforeGroove).map(({ bytes }) => bytes.join(',')))).toEqual(
      new Set(['128,60,0', '129,55,0'])
    )
  })

  it('replaces a track generation without canceling the other channel and keeps routed chord pickup', async () => {
    const { engine, fake, advance } = await fixture()
    engine.schedule([note], [chord], config)
    const [oldLead, chordOn] = callbacks()
    oldLead!(1.05)
    chordOn!(1.05)
    advance(1030)
    advance(1060)
    engine.scheduleLead([{ ...note, id: 'replacement' }], config, true)
    expect(fake.delivered.at(-1)?.bytes).toEqual([0x80, 60, 0])
    expect(fake.delivered.some(({ bytes }) => bytes[0] === 0x81)).toBe(false)
    oldLead!(1.15)
    vi.spyOn(engine, 'getCurrentStep').mockReturnValue(4)
    engine.scheduleChords([chord], config)
    expect(fake.delivered.some(({ bytes }) => bytes[0] === 0x81 && bytes[1] === 55)).toBe(true)
    advance(1140)
    advance(1165)
    expect(fake.delivered.at(-1)?.bytes).toEqual([0x91, 55, expect.any(Number)])
  })

  it('invalidates queued loop callbacks and notes when loop bounds change', async () => {
    const { engine, fake, advance } = await fixture()
    engine.schedule([note], [], config)
    const old = callbacks()[0]!
    old(1.05)
    advance(1030)
    advance(1060)
    engine.setLoop(4, 8, true)
    const count = fake.port.send.mock.calls.length
    old(1.15)
    expect(fake.port.send).toHaveBeenCalledTimes(count)
    expect(fake.delivered.at(-1)?.bytes).toEqual([0x80, 60, 0])
  })

  it.each(['reset', 'load'] as const)('%s releases old project MIDI before settings are applied', async (boundary) => {
    const { engine, fake, advance } = await fixture()
    engine.schedule([note], [chord], config)
    callbacks().forEach((callback) => callback(1.05))
    advance(1030)
    advance(1060)
    if (boundary === 'reset') useProjectStore().reset()
    else {
      Object.assign(page, { localStorage: { getItem: () => '{invalid' } })
      useAudioSettingsStore().hydrateProjectAudio()
    }
    expect(fake.delivered.slice(-2).map(({ bytes }) => bytes)).toEqual([
      [0x80, 60, 0],
      [0x81, 55, 0]
    ])
  })

  it('Panic sends Offs followed by safety controllers only on channels this app used', async () => {
    const { engine, fake, advance } = await fixture()
    engine.schedule([note], [], config)
    callbacks()[0]!(1.05)
    advance(1030)
    advance(1060)
    engine.panic()
    const cleanup = fake.delivered.filter(({ bytes }) => bytes[0] !== 0x90)
    expect(cleanup.filter(({ bytes }) => bytes[0] === 0xb0).map(({ bytes }) => bytes)).toEqual([
      [0xb0, 64, 0],
      [0xb0, 123, 0],
      [0xb0, 120, 0]
    ])
    expect(cleanup.slice(0, -3).every(({ bytes }) => bytes[0] === 0x80 && bytes[1] === 60)).toBe(true)
    const staleWakeup = fake.callback
    engine.dispose()
    engine.dispose()
    const count = fake.port.send.mock.calls.length
    staleWakeup?.()
    for (const listener of loopListeners) listener(1.5)
    expect(fake.port.send).toHaveBeenCalledTimes(count)
  })

  it('injects the verified MIDI runtime into application initialization while leaving access explicit', async () => {
    const fake = new QueueFake()
    fake.queue.dispose()
    const access = new AccessFake(fake.port)
    const request = vi.fn(async () => access)
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('navigator', { requestMIDIAccess: request })
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    cleanups.push(() => {
      vi.useRealTimers()
    })
    const performanceClock = vi.spyOn(performance, 'now').mockImplementation(() => fake.nowMs)
    cleanups.push(() => performanceClock.mockRestore())
    Object.defineProperty(context.rawContext, 'currentTime', { configurable: true, get: () => fake.nowMs / 1000 })
    const audio = useAudioStore()
    const engine = (await audio.initializeAudio())!
    cleanups.push(() => engine.dispose())
    expect(engine).not.toBeNull()
    expect(request).not.toHaveBeenCalled()
    const midi = useMidiOutputStore()
    expect(midi.getSettings()).toEqual(DEFAULT_MIDI_OUTPUT_SETTINGS)
    await midi.enable()
    await midi.setRoute('lead', {
      ...DEFAULT_MIDI_OUTPUT_SETTINGS.lead,
      mode: 'midi',
      port: { id: fake.port.id, name: null, manufacturer: null }
    })
    useMelodyStore().setNotes([note])
    await audio.play()
    callbacks().at(-1)!(1.05)
    fake.nowMs = 1035
    vi.advanceTimersByTime(DEFAULT_MIDI_QUEUE_TIMING.pumpIntervalMs)
    fake.nowMs = 1060
    fake.flush()
    expect(fake.delivered.some(({ bytes }) => bytes[0] === 0x90 && bytes[1] === 60)).toBe(true)
    audio.panic()
    expect(fake.delivered.at(-1)?.bytes).toEqual([0xb0, 120, 0])
  })

  it('prevents a delayed audio unlock from starting transport after Panic', async () => {
    const { engine } = await fixture()
    context.state = 'suspended'
    const unlock = deferred<void>()
    toneMock.start.mockReturnValueOnce(unlock.promise)
    mock.transport.start.mockClear()
    const starting = engine.play()
    engine.panic()
    context.state = 'running'
    unlock.resolve()
    await starting
    expect(mock.transport.start).not.toHaveBeenCalled()
  })
})

describe('external auditions through the playback engine', () => {
  async function previewFixture() {
    const result = await fixture()
    result.engine.pause()
    mock.transport.state = 'paused'
    result.runtime.setSendPreviews(true)
    result.fake.port.send.mockClear()
    return result
  }

  it.each(['note', 'chord', 'notes', 'progression'] as const)(
    'keeps the internal %s preview and fans out its actual notes even on MIDI-only routes',
    async (kind) => {
      const { engine, runtime, fake, advance } = await previewFixture()
      for (const track of ['lead', 'chord'] as const)
        await runtime.setRoute(track, { ...runtime.getSettings()[track], mode: 'midi' })
      if (kind === 'note') engine.previewNote('D4', '8n', 0.8)
      if (kind === 'chord') engine.previewChord(['E', 'G3'], '2n', 0.7)
      if (kind === 'notes') engine.auditionNotes([{ ...note, midi: 62, pitch: 'D4', velocity: 91 }], 120)
      if (kind === 'progression') engine.previewProgression([chord], 120)
      const session = {
        note: 'note-audition',
        chord: 'chord-audition',
        notes: 'take-audition',
        progression: 'progression-preview'
      } as const
      expect(engine.generations.getActiveVoiceCount(session[kind])).toBeGreaterThan(0)
      advance(1070)
      advance(1100)
      const ons = fake.delivered.filter(({ bytes }) => (bytes[0]! & 0xf0) === 0x90).map(({ bytes }) => bytes)
      expect(ons).toEqual(
        {
          note: [[0x90, 62, 102]],
          chord: [
            [0x91, 52, 89],
            [0x91, 55, 89]
          ],
          notes: [[0x90, 62, 91]],
          progression: [[0x91, 55, 95]]
        }[kind]
      )
    }
  )

  it('preserves leading/trailing rests, muted notes and take completion without mutating project history', async () => {
    vi.useFakeTimers()
    const { engine, fake, advance } = await previewFixture()
    const melody = useMelodyStore()
    const takes = useTakesStore()
    const project = useProjectStore()
    const before = {
      notes: JSON.parse(JSON.stringify(melody.notes)),
      undo: melody.canUndo,
      takes: JSON.parse(JSON.stringify(takes.takes)),
      config: JSON.stringify(project.toConfig())
    }
    const finish = vi.fn()
    engine.auditionNotes(
      [
        { ...note, step: 20, durationSteps: 2 },
        { ...note, id: 'muted', step: 16, isMuted: true }
      ],
      120,
      finish,
      { originStep: 16, durationSteps: 16 }
    )
    expect(fake.port.send).not.toHaveBeenCalled()
    advance(1570)
    expect(fake.port.send).toHaveBeenCalledWith([0x90, 60, 100], 1600)
    advance(1600)
    advance(1820)
    expect(fake.port.send).toHaveBeenCalledWith([0x80, 60, 0], 1850)
    vi.advanceTimersByTime(1900)
    expect(finish).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200)
    expect(finish).toHaveBeenCalledTimes(1)
    expect({
      notes: melody.notes,
      undo: melody.canUndo,
      takes: takes.takes,
      config: JSON.stringify(project.toConfig())
    }).toEqual(before)
  })

  it.each([
    'stop',
    'pause',
    'panic',
    'dispose',
    'preference',
    'notes-stop',
    'notes-replace',
    'progression-stop',
    'progression-replace'
  ] as const)('%s removes sounding and future preview notes', async (action) => {
    const { engine, runtime, fake, advance } = await previewFixture()
    const progression = action.startsWith('progression')
    if (progression) engine.previewProgression([chord, { ...chord, id: 'later', voicing: ['A3'], startBar: 1 }], 120)
    else engine.auditionNotes([note, { ...note, id: 'later', midi: 62, pitch: 'D4', step: 8 }], 120)
    advance(1070)
    advance(1100)
    if (action === 'preference') runtime.setSendPreviews(false)
    else if (action === 'notes-stop') engine.stopNotesAudition()
    else if (action === 'notes-replace') engine.auditionNotes([], 120)
    else if (action === 'progression-stop') engine.stopProgressionPreview()
    else if (action === 'progression-replace') engine.previewProgression([], 120)
    else engine[action]()
    expect(fake.delivered.filter(({ bytes }) => (bytes[0]! & 0xf0) === 0x80).at(-1)?.bytes).toEqual(
      progression ? [0x81, 55, 0] : [0x80, 60, 0]
    )
    if (action === 'panic') expect(fake.delivered.some(({ bytes }) => bytes[0] === 0xb0 && bytes[1] === 120)).toBe(true)
    advance(5000)
    expect(fake.delivered.filter(({ bytes }) => (bytes[0]! & 0xf0) === 0x90)).toHaveLength(1)
  })

  it('routes multi-note previews without requiring an internal synth host', async () => {
    const { engine, fake, advance } = await previewFixture()
    const previews = new PreviewController({
      generations: engine.generations,
      outputRouter: engine.outputRouter,
      getLeadPreviewSynth: () => null,
      getChordPreviewSynth: () => null,
      holdVoice: () => {},
      truncateVoices: () => {}
    })
    cleanups.push(() => previews.dispose())
    previews.auditionNotes([note], 120)
    previews.previewProgression([chord], 120)
    advance(1070)
    advance(1100)
    expect(fake.delivered.filter(({ bytes }) => (bytes[0]! & 0xf0) === 0x90).map(({ bytes }) => bytes)).toEqual([
      [0x90, 60, 100],
      [0x91, 55, 95]
    ])
  })

  it.each(['route', 'disable', 'context', 'pagehide'] as const)(
    '%s ends external preview ownership without restarting old events',
    async (boundary) => {
      const { engine, runtime, access, fake, advance } = await previewFixture()
      engine.auditionNotes([note, { ...note, id: 'later', step: 8, midi: 62, pitch: 'D4' }], 120)
      advance(1070)
      advance(1100)
      if (boundary === 'route') await runtime.setRoute('lead', { ...runtime.getSettings().lead, mode: 'internal' })
      else if (boundary === 'disable') await access.disable()
      else if (boundary === 'pagehide') page.dispatchEvent(new Event('pagehide'))
      else {
        context.state = 'suspended'
        for (const listener of contextListeners) listener()
      }
      expect(fake.delivered.filter(({ bytes }) => bytes[0] === 0x80).at(-1)?.bytes).toEqual([0x80, 60, 0])
      advance(4000)
      expect(fake.delivered.filter(({ bytes }) => bytes[0] === 0x90)).toHaveLength(1)
    }
  )

  it('enables only the next audition and never restarts a queue after preference off/on', async () => {
    const { engine, runtime, fake, advance } = await previewFixture()
    runtime.setSendPreviews(false)
    engine.auditionNotes([note, { ...note, id: 'later', step: 8 }], 120)
    runtime.setSendPreviews(true)
    advance(1500)
    expect(fake.port.send).not.toHaveBeenCalled()
    engine.previewNote('E4')
    advance(1570)
    advance(1600)
    expect(fake.delivered.at(-1)?.bytes).toEqual([0x90, 64, 102])
    runtime.setSendPreviews(false)
    runtime.setSendPreviews(true)
    const count = fake.port.send.mock.calls.length
    advance(5000)
    expect(fake.port.send).toHaveBeenCalledTimes(count)
  })

  it('cancels test note before a transport on and blocks previews throughout asynchronous start', async () => {
    const { engine, runtime, fake, advance } = await previewFixture()
    expect(engine.testMidiNote('lead').ok).toBe(true)
    advance(1070)
    advance(1100)
    const gate = deferred<void>()
    const resume = runtime.resume.bind(runtime)
    vi.spyOn(runtime, 'resume').mockImplementation(async () => {
      await gate.promise
      await resume()
    })
    engine.schedule([note], [], config)
    const start = engine.play()
    expect(fake.delivered.at(-1)?.bytes).toEqual([0x80, 60, 0])
    expect(engine.testMidiNote('lead').ok).toBe(false)
    engine.previewNote('D4')
    expect(engine.generations.getActiveVoiceCount('note-audition')).toBe(1)
    gate.resolve()
    await start
    mock.transport.state = 'started'
    callbacks().at(-1)!(1.2)
    advance(1170)
    advance(1200)
    const messages = fake.delivered.map(({ bytes }) => bytes)
    expect(messages[0]).toEqual([0x90, 60, 102])
    expect(messages.slice(1, -1).every((bytes) => bytes[0] === 0x80 && bytes[1] === 60)).toBe(true)
    expect(messages.at(-1)).toEqual([0x90, 60, 100])
    expect(engine.testMidiNote('lead').ok).toBe(false)
    const count = fake.port.send.mock.calls.length
    engine.previewChord(['G3'])
    expect(engine.generations.getActiveVoiceCount('chord-audition')).toBe(1)
    expect(fake.port.send).toHaveBeenCalledTimes(count)
  })

  it.each(['shuffle', 'candidate', 'dock'] as const)(
    'ends the real Arp queue on %s while leaving notes, undo and takes untouched',
    async (action) => {
      const { fake, advance } = await previewFixture()
      const melody = useMelodyStore()
      const project = useProjectStore()
      const ui = useUiStore()
      const index = vi.spyOn(trainedModelService, 'loadTrainedModelIndex').mockResolvedValue(null)
      await melody.loadArpModels()
      index.mockRestore()
      project.setWorkRange({ startStep: 0, endStep: 32 })
      melody.setGeneratorParams({ arpPattern: 'up', arpRate: '1/16', arpSeed: 42, arpSeedLocked: true })
      ui.setArpStudioOpen(true)
      const candidate = melody.syncArpCandidate()!
      await melody.auditionArp()
      advance(1070)
      advance(1100)
      const heard = fake.delivered.filter(({ bytes }) => bytes[0] === 0x90)
      expect(heard.length).toBeGreaterThan(0)
      expect(heard[0]!.bytes[1]).toBe(candidate.notes[0]!.midi)
      if (action === 'shuffle') melody.shuffleArp()
      else if (action === 'candidate') {
        melody.setGeneratorParams({ arpDensity: 60 })
        melody.syncArpCandidate()
      } else ui.setSoundDockOpen(true)
      expect(useAudioStore().auditioningId).toBeNull()
      advance(6000)
      expect(fake.delivered.filter(({ bytes }) => bytes[0] === 0x90)).toHaveLength(heard.length)
      expect(melody.notes).toEqual([])
      expect(melody.canUndo).toBe(false)
      expect(useTakesStore().takes).toEqual([])
    }
  )

  it('replaces a take audition through the store without leaving its queued notes', async () => {
    const { fake, advance } = await previewFixture()
    const audio = useAudioStore()
    await audio.auditionNotes([note, { ...note, id: 'future', midi: 62, pitch: 'D4', step: 8 }], 120, 'take-a')
    advance(1070)
    advance(1100)
    await audio.auditionNotes([{ ...note, id: 'other', midi: 64, pitch: 'E4' }], 120, 'take-b')
    expect(audio.auditioningId).toBe('take-b')
    advance(1170)
    advance(1200)
    audio.stopNotesAudition()
    advance(4000)
    expect(fake.delivered.filter(({ bytes }) => bytes[0] === 0x90).map(({ bytes }) => bytes[1])).toEqual([60, 64])
  })

  it('keeps long progression events out of the browser port and cancels them on disconnect', async () => {
    const { engine, fake, ports, advance } = await previewFixture()
    engine.previewProgression([chord, { ...chord, id: 'far-future', voicing: ['A3'], startBar: 16 }], 120)
    expect(fake.port.send).not.toHaveBeenCalled()
    advance(1070)
    advance(1100)
    expect(fake.port.send.mock.calls.every(([, time]) => time <= 1130)).toBe(true)
    fake.port.state = 'disconnected'
    ports.change()
    advance(34000)
    expect(fake.delivered.filter(({ bytes }) => bytes[0] === 0x91).map(({ bytes }) => bytes[1])).toEqual([55])
  })

  it('cancels the progression on a dock change and preserves other preview sessions', async () => {
    const { engine, fake, advance } = await previewFixture()
    const ui = useUiStore()
    ui.setChordStudioOpen(true)
    await useAudioStore().previewProgression([chord, { ...chord, id: 'future', startBar: 2 }])
    engine.auditionNotes([note], 120)
    advance(1070)
    advance(1100)
    ui.setSoundDockOpen(true)
    expect(fake.delivered.at(-1)?.bytes).toEqual([0x81, 55, 0])
    advance(2070)
    advance(2100)
    expect(fake.delivered.at(-1)?.bytes).toEqual([0x80, 60, 0])
    expect(useAudioStore().isPreviewingProgression).toBe(false)
  })
})
