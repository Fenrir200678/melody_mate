import { beforeEach, describe, expect, it, vi } from 'vitest'

const { toneMock } = await vi.hoisted(async () => {
  const { createToneMock } = await import('../helpers/tone-mock')
  return createToneMock()
})
vi.mock('tone', () => toneMock)

import { TrackOutputRouter, type TrackOutputEvent } from '../../src/audio/output-router'
import type { InstrumentHost } from '../../src/audio/instrument-host'
import { DEFAULT_MIDI_OUTPUT_SETTINGS, DEFAULT_MIDI_QUEUE_TIMING } from '../../src/config/defaults'
import type { MidiOutputSettings, OutputRouteMode } from '../../src/core/midi/output.types'
import { createEventGenerationTracker } from '../../src/core/synth/event-generation'

describe('track output router', () => {
  const event: TrackOutputEvent = {
    track: 'lead',
    generation: 0,
    pitches: 'C4',
    midiNotes: [{ midi: 60, source: { kind: 'melody', noteId: 'lead-note' } }],
    velocity: 100 / 127,
    onTimeSeconds: 10,
    durationSeconds: 2,
    startStep: 12,
    stepDurationSeconds: 0.125
  }

  function fixture(mode: OutputRouteMode, hasInstrument = true) {
    const playNote = vi.fn()
    const getInstrument = vi.fn(() => (hasInstrument ? ({ playNote } as unknown as InstrumentHost) : null))
    const enqueue = vi.fn()
    const onError = vi.fn()
    const holdVoice = vi.fn()
    const generations = createEventGenerationTracker()
    const isAudible = vi.fn(() => true)
    const settings: MidiOutputSettings = {
      lead: { ...DEFAULT_MIDI_OUTPUT_SETTINGS.lead, mode },
      chord: { ...DEFAULT_MIDI_OUTPUT_SETTINGS.chord, mode }
    }
    const router = new TrackOutputRouter({
      generations,
      isAudible,
      getInstrument,
      holdVoice,
      runtime: { sessionId: 'router-session', getSettings: () => settings, midi: { enqueue }, onError }
    })
    router.setLoop({ isLooping: false, loopEndStep: 16 })
    return { router, generations, playNote, getInstrument, enqueue, onError, holdVoice, isAudible, settings }
  }

  beforeEach(() => {
    const context = { ...toneMock.getContext(), lookAhead: 0.1, updateInterval: 0.05 }
    toneMock.getContext.mockReturnValue(context)
    toneMock.immediate.mockReturnValue(9.94)
  })

  it('preserves the internal host timing, velocity and voice ownership', () => {
    const f = fixture('internal')
    f.router.dispatch(event)
    expect(f.playNote).toHaveBeenCalledWith(expect.any(String), 'C4', 2, 10, 100 / 127)
    expect(f.holdVoice).toHaveBeenCalledWith(f.playNote.mock.calls[0][0], 2)
    expect(f.generations.getActiveVoiceCount('transport-lead')).toBe(1)
    expect(f.enqueue).not.toHaveBeenCalled()
  })

  it('dispatches MIDI without looking up or owning an internal instrument voice', () => {
    const f = fixture('midi', false)
    f.router.dispatch(event)
    expect(f.getInstrument).not.toHaveBeenCalled()
    expect(f.generations.getActiveVoiceCount()).toBe(0)
    expect(f.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        source: event.midiNotes[0].source,
        midi: 60,
        velocity: 100,
        generation: 0,
        loopIteration: 0,
        sessionId: 'router-session',
        onTimeSeconds: 10,
        offTimeSeconds: 12
      })
    )
  })

  it('shares the loop gate between both branches and separates output iterations', () => {
    const f = fixture('both')
    f.router.setLoop({ isLooping: true, loopEndStep: 16 })
    f.router.dispatch(event)
    expect(f.playNote).toHaveBeenCalledWith(expect.any(String), 'C4', 0.5, 10, 100 / 127)
    expect(f.enqueue).toHaveBeenLastCalledWith(expect.objectContaining({ onTimeSeconds: 10, offTimeSeconds: 10.5 }))
    const firstId = f.enqueue.mock.calls[0][0].eventId
    expect(f.router.prepareLoopBoundary(10.5)).toEqual({
      sessionId: 'router-session',
      loopIteration: 0,
      audioTimeSeconds: 10.5
    })
    f.router.dispatch({ ...event, onTimeSeconds: 12 })
    const next = f.enqueue.mock.calls[1][0]
    expect(next.loopIteration).toBe(1)
    expect(next.eventId).not.toBe(firstId)
    expect(next.source).toEqual(event.midiNotes[0].source)
    expect(next.offTimeSeconds).toBe(12.5)
  })

  it('suppresses both branches when inaudible or when a callback generation is stale', () => {
    const f = fixture('both')
    f.isAudible.mockReturnValue(false)
    f.router.dispatch(event)
    f.isAudible.mockReturnValue(true)
    f.generations.invalidate('transport-lead')
    f.router.dispatch(event)
    expect(f.playNote).not.toHaveBeenCalled()
    expect(f.enqueue).not.toHaveBeenCalled()
    f.router.dispatch({ ...event, generation: 1 })
    expect(f.enqueue).toHaveBeenCalledOnce()
    expect(f.enqueue.mock.calls[0][0].source).toEqual(event.midiNotes[0].source)
  })

  it('keeps internal playback when the MIDI queue fails', () => {
    const f = fixture('both')
    f.enqueue.mockImplementation(() => {
      throw new Error('Port unavailable')
    })
    expect(() => f.router.dispatch(event)).not.toThrow()
    expect(f.playNote).toHaveBeenCalledOnce()
    expect(f.onError).toHaveBeenCalledWith(expect.any(Error), event)
  })

  it('rejects unsupported negative offsets using the current context and actual callback advance', () => {
    const f = fixture('both')
    f.settings.lead.offsetMs = -50
    f.router.dispatch(event)
    expect(f.enqueue).not.toHaveBeenCalled()
    expect(f.onError).toHaveBeenCalledWith(expect.any(RangeError), event)
    expect(f.playNote).toHaveBeenCalledOnce()
    f.settings.lead.offsetMs = -20
    f.router.dispatch(event)
    expect(f.enqueue).toHaveBeenCalledOnce()
    f.enqueue.mockClear()
    toneMock.immediate.mockReturnValue(9.995)
    f.settings.lead.offsetMs = 0
    f.router.dispatch(event)
    expect(f.enqueue).not.toHaveBeenCalled()
  })

  it('supports the exact conservative negative-offset budget boundary', () => {
    const f = fixture('midi')
    f.settings.lead.offsetMs = -(
      50 -
      DEFAULT_MIDI_QUEUE_TIMING.pumpIntervalMs -
      DEFAULT_MIDI_QUEUE_TIMING.cancelGuardMs
    )
    f.router.dispatch(event)
    expect(f.enqueue).toHaveBeenCalledOnce()
    f.settings.lead.offsetMs -= 0.01
    f.router.dispatch(event)
    expect(f.enqueue).toHaveBeenCalledOnce()
    expect(f.onError).toHaveBeenCalledOnce()
  })

  it('does not start a note at the loop-end boundary', () => {
    const f = fixture('both')
    f.router.setLoop({ isLooping: true, loopEndStep: 12 })
    f.router.dispatch(event)
    expect(f.playNote).not.toHaveBeenCalled()
    expect(f.enqueue).not.toHaveBeenCalled()
  })
})
