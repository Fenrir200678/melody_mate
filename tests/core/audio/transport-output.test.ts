import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { mock, toneMock } = await vi.hoisted(async () => {
  const { createToneMock } = await import('../../helpers/tone-mock')
  const created = createToneMock()
  return { mock: created, toneMock: created.toneMock }
})
vi.mock('tone', () => toneMock)

import { PlaybackEngine } from '../../../src/audio/playback-engine'
import { DEFAULT_MIDI_OUTPUT_SETTINGS, DEFAULT_TRANSPORT_OUTPUT } from '../../../src/config/defaults'
import type { MidiOutputSettings, OutputRouteMode } from '../../../src/core/midi/output.types'
import type { AppNote } from '../../../src/core/schemas/note.schema'
import type { ChordEvent } from '../../../src/core/schemas/chord.schema'
import { ProjectSchema, PROJECT_SCHEMA_VERSION } from '../../../src/core/schemas/project.schema'
import { useAudioStore } from '../../../src/stores/audio.store'
import { useMelodyStore } from '../../../src/stores/melody.store'
import { useHarmonyStore } from '../../../src/stores/harmony.store'
import { useProjectStore } from '../../../src/stores/project.store'
import { resetMockAudioNodes } from '../../helpers/tone-mock'

const { MockPolySynth, mockTransportSchedule, mockTransportClear, transport } = mock

describe('transport output integration', () => {
  const config = ProjectSchema.parse({
    version: PROJECT_SCHEMA_VERSION,
    bpm: 120,
    bars: 4,
    swing: 1,
    timingLooseness: 0,
    isLooping: false
  })
  const note: AppNote = { id: 'lead-1', pitch: 'D4', midi: 62, step: 2, durationSteps: 4, velocity: 83, isMuted: false }
  const chord: ChordEvent = {
    id: 'chord-1',
    name: 'C',
    roman: 'I',
    notes: ['C3', 'E3', 'G3'],
    voicing: ['G2', 'C4', 'E5'],
    startBar: 0,
    durationBars: 2
  }

  function fixture(lead: OutputRouteMode = 'both', chordMode: OutputRouteMode = lead, isChordEnabled?: () => boolean) {
    const settings: MidiOutputSettings = {
      lead: { ...DEFAULT_MIDI_OUTPUT_SETTINGS.lead, mode: lead },
      chord: { ...DEFAULT_MIDI_OUTPUT_SETTINGS.chord, mode: chordMode }
    }
    const enqueue = vi.fn()
    const onError = vi.fn()
    const engine = new PlaybackEngine(
      undefined,
      {
        sessionId: 'transport-test',
        getSettings: () => settings,
        midi: { enqueue },
        onError
      },
      isChordEnabled
    )
    return { engine, enqueue, onError, settings }
  }

  function callbacks() {
    return mockTransportSchedule.mock.calls as unknown as [(time: number) => void, string][]
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('window', {})
    resetMockAudioNodes()
    MockPolySynth.instances = []
    mockTransportSchedule.mockClear()
    mockTransportClear.mockClear()
    transport.state = 'stopped'
    transport.seconds = 2
    transport.bpm.value = 120
    transport.bpm.rampTo.mockClear()
    const context = { ...toneMock.getContext(), lookAhead: 0.1, updateInterval: 0.05 }
    toneMock.getContext.mockReturnValue(context)
    toneMock.immediate.mockReturnValue(0)
    toneMock.now.mockReturnValue(10)
  })

  it('uses grooved Tone positions, musical velocity and the concrete voicing in both outputs', () => {
    const { engine, enqueue } = fixture()
    engine.schedule([note, { ...note, id: 'muted-note', isMuted: true }], [chord], config)
    expect(enqueue).not.toHaveBeenCalled()
    expect(callbacks().map(([, position]) => position)).toEqual(['128i', '0i'])
    callbacks()[0][0](10.25)
    callbacks()[1][0](11)
    expect(MockPolySynth.instances[0].triggerAttackRelease).toHaveBeenCalledWith('D4', 0.5, 10.25, 83 / 127)
    expect(MockPolySynth.instances[1].triggerAttackRelease).toHaveBeenCalledWith(
      chord.voicing,
      4,
      11,
      DEFAULT_TRANSPORT_OUTPUT.chordVelocity
    )
    expect(enqueue.mock.calls.map(([intent]) => [intent.midi, intent.onTimeSeconds, intent.offTimeSeconds])).toEqual([
      [62, 10.25, 10.75],
      [43, 11, 15],
      [60, 11, 15],
      [76, 11, 15]
    ])
    expect(enqueue.mock.calls[0][0].velocity).toBe(83)
    expect(enqueue.mock.calls.slice(1).every(([intent]) => intent.source.chordId === chord.id)).toBe(true)
    engine.dispose()
  })

  it('dispatches scheduled MIDI-only notes and chord pickup without synth hosts', () => {
    vi.stubGlobal('window', undefined)
    const { engine, enqueue } = fixture('midi')
    engine.schedule([note], [chord], config)
    callbacks()[0][0](10)
    callbacks()[1][0](11)
    expect(MockPolySynth.instances).toHaveLength(0)
    expect(enqueue).toHaveBeenCalledTimes(4)
    enqueue.mockClear()
    transport.state = 'started'
    vi.spyOn(engine, 'getCurrentStep').mockReturnValue(20)
    engine.scheduleChords([chord], config)
    expect(enqueue.mock.calls.map(([intent]) => [intent.midi, intent.onTimeSeconds, intent.offTimeSeconds])).toEqual([
      [43, 10, 11.5],
      [60, 10, 11.5],
      [76, 10, 11.5]
    ])
    expect(engine.generations.getActiveVoiceCount()).toBe(0)
    engine.dispose()
  })

  it('uses the same pickup remainder and loop gate internally and externally', () => {
    const { engine, enqueue } = fixture()
    transport.state = 'started'
    vi.spyOn(engine, 'getCurrentStep').mockReturnValue(20)
    engine.scheduleChords([chord], { ...config, isLooping: true, loopEndStep: 24 })
    expect(MockPolySynth.instances[1].triggerAttackRelease).toHaveBeenCalledWith(
      chord.voicing,
      0.5,
      10,
      DEFAULT_TRANSPORT_OUTPUT.chordVelocity
    )
    expect(enqueue.mock.calls.every(([intent]) => intent.onTimeSeconds === 10 && intent.offTimeSeconds === 10.5)).toBe(
      true
    )
    engine.dispose()
  })

  it('ends internal note gates at the loop boundary while retaining the instrument release path', () => {
    const { engine, enqueue } = fixture('internal')
    engine.schedule([{ ...note, step: 15 }], [chord], { ...config, swing: 0, isLooping: true, loopEndStep: 16 })
    MockPolySynth.instances[1].releaseAll.mockClear()
    callbacks()[0][0](10)
    callbacks()[1][0](11)
    expect(MockPolySynth.instances[0].triggerAttackRelease).toHaveBeenCalledWith('D4', 0.125, 10, 83 / 127)
    expect(MockPolySynth.instances[1].triggerAttackRelease).toHaveBeenCalledWith(
      chord.voicing,
      2,
      11,
      DEFAULT_TRANSPORT_OUTPUT.chordVelocity
    )
    expect(MockPolySynth.instances[1].releaseAll).not.toHaveBeenCalled()
    expect(enqueue).not.toHaveBeenCalled()
    engine.dispose()
  })

  it('updates only melody routing and leaves the original chord callback valid', () => {
    const { engine, enqueue, settings } = fixture('both', 'midi')
    engine.schedule([note], [chord], config)
    const [oldLead, originalChord] = callbacks().map(([callback]) => callback)
    settings.lead.mode = 'internal'
    engine.scheduleLead([{ ...note, step: 8 }], config)
    oldLead(10)
    originalChord(11)
    callbacks().at(-1)![0](12)
    expect(enqueue).toHaveBeenCalledTimes(3)
    expect(enqueue.mock.calls.every(([intent]) => intent.track === 'chord')).toBe(true)
    expect(MockPolySynth.instances[0].triggerAttackRelease).toHaveBeenCalledOnce()
    expect(MockPolySynth.instances[1].triggerAttackRelease).not.toHaveBeenCalled()
    expect(mockTransportClear).toHaveBeenCalledOnce()
    engine.dispose()
  })

  it('uses mute, solo and Harmony enablement for both outputs while zero faders keep MIDI velocity', () => {
    let harmonyEnabled = true
    const { engine, enqueue } = fixture('both', 'both', () => harmonyEnabled)
    engine.schedule([note], [chord], config)
    const [leadOn, chordOn] = callbacks().map(([callback]) => callback)
    engine.effectsRack.setLeadMute(true)
    leadOn(10)
    engine.effectsRack.setChordMute(true)
    chordOn(10)
    expect(enqueue).not.toHaveBeenCalled()
    engine.effectsRack.setLeadMute(false)
    engine.effectsRack.setChordMute(false)
    engine.effectsRack.setLeadSolo(true)
    chordOn(10)
    engine.effectsRack.setLeadSolo(false)
    engine.effectsRack.setChordSolo(true)
    leadOn(10)
    engine.effectsRack.setChordSolo(false)
    harmonyEnabled = false
    chordOn(10)
    expect(enqueue).not.toHaveBeenCalled()
    expect(MockPolySynth.instances[0].triggerAttackRelease).not.toHaveBeenCalled()
    expect(MockPolySynth.instances[1].triggerAttackRelease).not.toHaveBeenCalled()
    engine.effectsRack.setMasterVolume(0)
    engine.effectsRack.setLeadVolume(0)
    engine.effectsRack.setChordVolume(0)
    harmonyEnabled = true
    leadOn(11)
    chordOn(11)
    expect(enqueue).toHaveBeenCalledTimes(4)
    expect(enqueue.mock.calls[0][0].velocity).toBe(83)
    expect(enqueue.mock.calls[1][0].velocity).toBe(Math.round(DEFAULT_TRANSPORT_OUTPUT.chordVelocity * 127))
    engine.dispose()
  })

  it('rebuilds both tracks after live BPM changes, retaining the ramp and sounding internal voices', () => {
    const { engine, enqueue } = fixture()
    const audio = useAudioStore()
    const project = useProjectStore()
    project.setBpm(120)
    project.setLooping(false)
    useMelodyStore().addNote(note)
    useHarmonyStore().setChords([chord])
    audio.setPlaybackEngine(engine)
    audio.syncSchedule()
    const oldCallbacks = callbacks().map(([callback]) => callback)
    oldCallbacks[0](10)
    transport.state = 'started'
    audio.isPlaying = true
    project.setBpm(60)
    audio.setBpm(project.bpm)
    expect(transport.bpm.rampTo).toHaveBeenCalledWith(60, expect.any(Number))
    expect(transport.bpm.value).toBe(120)
    const callsBeforeStale = enqueue.mock.calls.length
    oldCallbacks.forEach((callback) => callback(11))
    expect(enqueue).toHaveBeenCalledTimes(callsBeforeStale)
    callbacks().at(-2)![0](12)
    callbacks().at(-1)![0](13)
    expect(MockPolySynth.instances[0].triggerAttackRelease).toHaveBeenLastCalledWith('D4', 1, 12, 83 / 127)
    expect(MockPolySynth.instances[1].triggerAttackRelease).toHaveBeenLastCalledWith(
      chord.voicing,
      8,
      13,
      DEFAULT_TRANSPORT_OUTPUT.chordVelocity
    )
    expect(enqueue.mock.calls.slice(-4).map(([intent]) => intent.offTimeSeconds - intent.onTimeSeconds)).toEqual([
      1, 8, 8, 8
    ])
    expect(engine.generations.getActiveVoiceCount('transport-lead')).toBe(2)
    engine.dispose()
  })

  it('keeps application playback internal without explicit runtime injection', async () => {
    const audio = useAudioStore()
    const harmony = useHarmonyStore()
    harmony.setChords([chord])
    useMelodyStore().addNote(note)
    const engine = (await audio.initializeAudio())!
    const contextQuery = vi.spyOn(toneMock, 'getContext')
    audio.syncSchedule()
    const chordOn = callbacks().at(-1)![0]
    harmony.setMuted(true)
    chordOn(10)
    expect(MockPolySynth.instances.flatMap((synth) => synth.triggerAttackRelease.mock.calls)).toHaveLength(0)
    harmony.setMuted(false)
    chordOn(10)
    callbacks()[0][0](10)
    const playedPitches = MockPolySynth.instances
      .flatMap((synth) => synth.triggerAttackRelease.mock.calls)
      .map(([pitches]) => pitches)
    expect(playedPitches).toContain(note.pitch)
    expect(playedPitches).toContainEqual(chord.voicing)
    const dispatchContextCalls = contextQuery.mock.calls.length
    callbacks()[0][0](11)
    expect(contextQuery.mock.calls).toHaveLength(dispatchContextCalls)
    engine.dispose()
  })
})
