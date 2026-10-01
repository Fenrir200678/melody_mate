import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { mock, toneMock } = await vi.hoisted(async () => {
  const helpers = await import('../../helpers/tone-mock')
  const created = helpers.createToneMock()
  return { mock: created, toneMock: created.toneMock }
})

vi.mock('tone', () => toneMock)

import { EffectsRack } from '../../../src/audio/mixer'
import { PlaybackEngine } from '../../../src/audio/playback-engine'
import { useAudioStore } from '../../../src/stores/audio.store'
import type { ChordEvent } from '../../../src/core/schemas/chord.schema'
import type { AppNote } from '../../../src/core/schemas/note.schema'
import { ProjectSchema, PROJECT_SCHEMA_VERSION } from '../../../src/core/schemas/project.schema'
import { resetMockAudioNodes } from '../../helpers/tone-mock'
import { createProgressionChords } from '../../../src/core/theory/progressions'

const { MockPolySynth, mockTransportSchedule, mockTransportClear, transport } = mock

describe('PlaybackEngine', () => {
  const projectConfig = ProjectSchema.parse({
    version: PROJECT_SCHEMA_VERSION,
    bpm: 120,
    bars: 4
  })

  const sampleNotes: AppNote[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      pitch: 'C4',
      midi: 60,
      step: 0,
      durationSteps: 2,
      velocity: 100,
      isMuted: false
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      pitch: 'E4',
      midi: 64,
      step: 4,
      durationSteps: 2,
      velocity: 90,
      isMuted: true // Muted
    }
  ]

  const sampleChords: ChordEvent[] = [
    {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Am',
      roman: 'vi',
      notes: ['A3', 'C4', 'E4'],
      voicing: ['A3', 'C4', 'E4'],
      startBar: 0,
      durationBars: 2
    }
  ]

  beforeEach(() => {
    vi.stubGlobal('window', {})
    resetMockAudioNodes()
    MockPolySynth.instances = []
    mockTransportSchedule.mockClear()
    mockTransportClear.mockClear()
    transport.state = 'stopped'
  })

  it('schedules notes and chords on the transport', () => {
    const engine = new PlaybackEngine()

    engine.schedule(sampleNotes, sampleChords, projectConfig)

    // Expect 1 call for unmuted note + 1 call for chord = 2 scheduled callbacks
    expect(mockTransportSchedule).toHaveBeenCalledTimes(2)

    engine.dispose()
  })

  it('schedules distinct offbeat stab attacks with sixteenth-note gates', () => {
    const engine = new PlaybackEngine()
    const chords = createProgressionChords('deep-house-offbeat-stabs', 'C', 1)
    const config = { ...projectConfig, swing: 0, timingLooseness: 0 }
    engine.schedule([], chords, config)
    const scheduled = mockTransportSchedule.mock.calls as unknown as [(time: number) => void, string][]
    expect(scheduled.map(([, position]) => position)).toEqual(['96i', '288i', '480i', '672i'])
    const chordSynth = MockPolySynth.instances[1]
    scheduled.forEach(([callback], index) => callback(index * 0.5))
    expect(chordSynth.triggerAttackRelease).toHaveBeenCalledTimes(4)
    expect(chordSynth.triggerAttackRelease).toHaveBeenNthCalledWith(1, chords[0].voicing, 0.125, 0, 0.75)
    engine.dispose()
  })

  it('schedules swing, loops and seeks in canonical sixteenth-note coordinates', () => {
    const engine = new PlaybackEngine()
    const config = ProjectSchema.parse({
      version: PROJECT_SCHEMA_VERSION,
      bpm: 120,
      bars: 4,
      swing: 1,
      timingLooseness: 0,
      loopStartStep: 8,
      loopEndStep: 16
    })

    engine.schedule([{ ...sampleNotes[0], step: 1 }], sampleChords, config)

    expect(mockTransportSchedule).toHaveBeenNthCalledWith(1, expect.any(Function), '64i')
    expect(mockTransportSchedule).toHaveBeenNthCalledWith(2, expect.any(Function), '0i')
    expect(transport.loopStart).toBe('0:2:0')
    expect(transport.loopEnd).toBe('1:0:0')
    engine.seekToStep(3)
    expect(transport.position).toBe('0:0:3')
    engine.dispose()
  })

  it('schedules eighth-grid offbeats on triplet timing at full swing', () => {
    const engine = new PlaybackEngine()
    const config = ProjectSchema.parse({
      version: PROJECT_SCHEMA_VERSION,
      bpm: 120,
      swing: 1,
      timingLooseness: 0
    })

    engine.scheduleLead([{ ...sampleNotes[0], step: 2 }], config)

    expect(mockTransportSchedule).toHaveBeenCalledWith(expect.any(Function), '128i')
    engine.dispose()
  })

  it('clears scheduled events on demand and during new schedules', () => {
    const engine = new PlaybackEngine()

    engine.schedule(sampleNotes, sampleChords, projectConfig)
    engine.clearScheduledEvents()

    expect(mockTransportClear).toHaveBeenCalledTimes(2)

    engine.dispose()
  })

  it('calculates current step accurately from transport seconds', () => {
    const engine = new PlaybackEngine()

    // Mock transport returns seconds = 2.0s
    // At 120 BPM, step is 0.125s -> step 16
    const step = engine.getCurrentStep(120)
    expect(step).toBe(16)

    // At 60 BPM, step is 0.25s -> step 8
    const stepSlow = engine.getCurrentStep(60)
    expect(stepSlow).toBe(8)

    engine.dispose()
  })

  it('exposes a continuous (fractional) playhead step for smooth rendering', () => {
    const engine = new PlaybackEngine()

    // Mock transport returns seconds = 2.0s -> at 120 BPM (0.125s per 16th) exactly step 16
    expect(engine.getPlayheadStep(120)).toBeCloseTo(16, 6)

    // At 100 BPM step duration is 0.15s -> 2.0/0.15 falls between grid steps, never floored
    expect(engine.getPlayheadStep(100)).toBeCloseTo(13.333, 3)
    expect(Number.isInteger(engine.getPlayheadStep(100))).toBe(false)

    engine.dispose()
  })

  it('supports audition previews for notes and chords', () => {
    const engine = new PlaybackEngine()

    expect(() => engine.previewNote('C4')).not.toThrow()
    expect(() => engine.previewChord(['C3', 'E3', 'G3'])).not.toThrow()

    engine.dispose()
  })

  it('auditions an unmuted note take once on the lead preview host and can stop it', () => {
    const engine = new PlaybackEngine()
    const leadPreview = MockPolySynth.instances[2]
    const transportLead = MockPolySynth.instances[0]
    const leadKill = engine.effectsRack.getVoiceKillNode('lead') as unknown as {
      gain: { linearRampToValueAtTime: ReturnType<typeof vi.fn> }
    }
    leadKill.gain.linearRampToValueAtTime.mockClear()

    engine.auditionNotes(sampleNotes, 120)

    expect(leadPreview.triggerAttack).toHaveBeenCalledTimes(1)
    expect(leadPreview.triggerAttack).toHaveBeenCalledWith(['C4'], expect.any(Number), 100 / 127)
    expect(engine.generations.getActiveVoiceCount('take-audition')).toBe(1)
    expect(transport.bpm.value).toBe(120)

    engine.stopNotesAudition()

    expect(leadPreview.releaseAll).toHaveBeenCalled()
    expect(transportLead.releaseAll).not.toHaveBeenCalled()
    expect(leadKill.gain.linearRampToValueAtTime).not.toHaveBeenCalled()
    expect(engine.generations.getActiveVoiceCount('take-audition')).toBe(0)
    engine.dispose()
  })

  it('releases take audition ownership automatically after its one-shot duration', () => {
    vi.useFakeTimers()
    try {
      const engine = new PlaybackEngine()
      engine.auditionNotes([sampleNotes[0]], 120)

      expect(engine.generations.getActiveVoiceCount('take-audition')).toBe(1)
      vi.advanceTimersByTime(500)
      expect(engine.generations.getActiveVoiceCount('take-audition')).toBe(0)
      engine.dispose()
    } finally {
      vi.useRealTimers()
    }
  })

  it('finishes a take audition on natural completion and manual cancellation exactly once', () => {
    vi.useFakeTimers()
    try {
      const engine = new PlaybackEngine()
      const onFinish = vi.fn()
      engine.auditionNotes([sampleNotes[0]], 120, onFinish)
      vi.advanceTimersByTime(500)
      expect(onFinish).toHaveBeenCalledTimes(1)

      const cancelledFinish = vi.fn()
      engine.auditionNotes([sampleNotes[0]], 120, cancelledFinish)
      engine.stopNotesAudition()
      vi.advanceTimersByTime(500)
      expect(cancelledFinish).toHaveBeenCalledTimes(1)
      engine.dispose()
    } finally {
      vi.useRealTimers()
    }
  })

  it('finishes a replaced audition before the new audition completes', () => {
    vi.useFakeTimers()
    try {
      const engine = new PlaybackEngine()
      const oldFinish = vi.fn()
      const newFinish = vi.fn()
      engine.auditionNotes([sampleNotes[0]], 120, oldFinish)
      engine.auditionNotes([sampleNotes[0]], 120, newFinish)
      expect(oldFinish).toHaveBeenCalledTimes(1)
      expect(newFinish).not.toHaveBeenCalled()
      vi.advanceTimersByTime(500)
      expect(oldFinish).toHaveBeenCalledTimes(1)
      expect(newFinish).toHaveBeenCalledTimes(1)
      engine.dispose()
    } finally {
      vi.useRealTimers()
    }
  })

  it('starts a take at its first loop note and schedules later notes only when due', () => {
    vi.useFakeTimers()
    try {
      const engine = new PlaybackEngine()
      const leadPreview = MockPolySynth.instances[2]
      const loopNotes = [
        { ...sampleNotes[0], step: 12 },
        { ...sampleNotes[0], id: '44444444-4444-4444-8444-444444444444', step: 16 }
      ]

      engine.auditionNotes(loopNotes, 120)

      expect(leadPreview.triggerAttack).toHaveBeenCalledTimes(1)
      expect(leadPreview.triggerAttack).toHaveBeenCalledWith(['C4'], 0, 100 / 127)
      vi.advanceTimersByTime(500)
      expect(leadPreview.triggerAttack).toHaveBeenCalledTimes(2)
      engine.dispose()
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps leading rests and the trailing span of a work range when an origin and duration are given', () => {
    vi.useFakeTimers()
    try {
      const engine = new PlaybackEngine()
      const leadPreview = MockPolySynth.instances[2]
      const onFinish = vi.fn()
      const note = { ...sampleNotes[0], step: 20 }

      // 120 BPM: one sixteenth is 0.125 s, so a 32-step range spans 4 s.
      engine.auditionNotes([note], 120, onFinish, { originStep: 16, durationSteps: 32 })

      expect(leadPreview.triggerAttack).not.toHaveBeenCalled()
      vi.advanceTimersByTime(499)
      expect(leadPreview.triggerAttack).not.toHaveBeenCalled()
      vi.advanceTimersByTime(2)
      expect(leadPreview.triggerAttack).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(3_000)
      expect(onFinish).not.toHaveBeenCalled()
      vi.advanceTimersByTime(700)
      expect(onFinish).toHaveBeenCalledTimes(1)
      engine.dispose()
    } finally {
      vi.useRealTimers()
    }
  })

  it('cancels future take note starts before they reach the instrument host', () => {
    vi.useFakeTimers()
    try {
      const engine = new PlaybackEngine()
      const leadPreview = MockPolySynth.instances[2]
      const laterNote = { ...sampleNotes[0], id: '55555555-5555-4555-8555-555555555555', step: 8 }

      engine.auditionNotes([sampleNotes[0], laterNote], 120)
      expect(leadPreview.triggerAttack).toHaveBeenCalledTimes(1)
      engine.stopNotesAudition()
      vi.advanceTimersByTime(2_000)

      expect(leadPreview.triggerAttack).toHaveBeenCalledTimes(1)
      expect(leadPreview.releaseAll).toHaveBeenCalled()
      expect(engine.generations.getActiveVoiceCount('take-audition')).toBe(0)
      engine.dispose()
    } finally {
      vi.useRealTimers()
    }
  })

  it('routes independent preview voices through their track inputs and one master', () => {
    const engine = new PlaybackEngine()
    const [, chord, leadPreview, chordPreview] = MockPolySynth.instances

    expect(leadPreview.isConnectedTo(engine.effectsRack.leadInput)).toBe(true)
    expect(chordPreview.isConnectedTo(engine.effectsRack.chordInput)).toBe(true)
    expect(leadPreview.toDestination).not.toHaveBeenCalled()
    expect(chordPreview.toDestination).not.toHaveBeenCalled()

    engine.previewNote('C4')
    engine.previewChord(['C3', 'E3', 'G3'])
    expect(leadPreview.triggerAttackRelease).toHaveBeenCalled()
    expect(chordPreview.triggerAttackRelease).toHaveBeenCalled()

    engine.setChordPreset('electric-piano')
    const replacedChordPreview = MockPolySynth.instances.at(-1)!
    expect(replacedChordPreview.toDestination).not.toHaveBeenCalled()
    expect(chord.isConnectedTo(engine.effectsRack.chordInput)).toBe(true)

    engine.dispose()
  })

  it('allows preset switching and connects to effects rack', () => {
    const rack = new EffectsRack()
    const engine = new PlaybackEngine(rack)

    expect(() => engine.setLeadPreset('pluck-arp')).not.toThrow()
    expect(() => engine.setChordPreset('electric-piano')).not.toThrow()

    // Auditioning after a lead preset switch rebuilds the preview synth from that preset
    expect(() => engine.previewNote('E4')).not.toThrow()

    engine.dispose()
  })

  it('crossfades a replaced voice graph instead of cutting it off abruptly', () => {
    const engine = new PlaybackEngine()
    const previousLead = MockPolySynth.instances[0]

    engine.setLeadPreset('analog-saw')

    const fade = engine.effectsRack.getVoiceGraphFades().find((entry) => entry.track === 'lead')!
    type MockGainNode = { isConnectedTo(target: unknown): boolean; gain: { linearRampToValueAtTime: unknown } }
    const incoming = fade.incoming as unknown as MockGainNode
    const outgoing = fade.outgoing as unknown as MockGainNode
    expect(previousLead.dispose).not.toHaveBeenCalled()
    expect(incoming.isConnectedTo(engine.effectsRack.leadInput)).toBe(true)
    expect(outgoing.isConnectedTo(engine.effectsRack.leadInput)).toBe(true)
    // The retired graph is faded to silence on the audio clock instead of being cut.
    expect(outgoing.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, expect.any(Number))
    expect(incoming.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1, expect.any(Number))
    expect(fade.crossfadeSeconds).toBeGreaterThan(0)

    engine.dispose()
    expect(previousLead.dispose).toHaveBeenCalled()
  })

  it('cancels a queued progression preview and cannot start later notes of that session', () => {
    vi.useFakeTimers()
    try {
      const engine = new PlaybackEngine()
      const chordPreview = MockPolySynth.instances[3]
      const onFinish = vi.fn()

      engine.previewProgression(sampleChords, 120, onFinish)
      const callsAfterStart = chordPreview.triggerAttackRelease.mock.calls.length
      expect(callsAfterStart).toBeGreaterThan(0)
      expect(engine.generations.getActiveVoiceCount('progression-preview')).toBe(1)

      engine.stopProgressionPreview()

      // The session is invalidated: no voice of it is owned any more, no completion is reported
      // and repeated cancels must not release anything again.
      expect(engine.generations.getActiveVoiceCount('progression-preview')).toBe(0)
      expect(chordPreview.releaseAll).toHaveBeenCalled()
      vi.advanceTimersByTime(10_000)
      expect(onFinish).not.toHaveBeenCalled()
      expect(chordPreview.triggerAttackRelease.mock.calls.length).toBe(callsAfterStart)

      engine.dispose()
    } finally {
      vi.useRealTimers()
    }
  })

  it('reports preview completion only for the current progression session', () => {
    vi.useFakeTimers()
    try {
      const engine = new PlaybackEngine()
      const onFinish = vi.fn()

      engine.previewProgression(sampleChords, 200, onFinish)
      vi.advanceTimersByTime(20_000)
      expect(onFinish).toHaveBeenCalledTimes(1)

      engine.dispose()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not fade the chord track when starting or cancelling an idle progression preview', () => {
    const engine = new PlaybackEngine()
    const chordKill = engine.effectsRack.getVoiceKillNode('chord') as unknown as {
      gain: { linearRampToValueAtTime: ReturnType<typeof vi.fn> }
    }

    engine.stopProgressionPreview()
    expect(engine.generations.getActiveVoiceCount('progression-preview')).toBe(0)
    // No owned voice existed, so no silence ramp may be scheduled.
    expect(chordKill.gain.linearRampToValueAtTime).not.toHaveBeenCalled()

    engine.stopProgressionPreview()
    expect(chordKill.gain.linearRampToValueAtTime).not.toHaveBeenCalled()

    engine.dispose()
  })

  it('fades the chord track when cancelling a sounding progression preview', () => {
    vi.useFakeTimers()
    try {
      const engine = new PlaybackEngine()
      const chordKill = engine.effectsRack.getVoiceKillNode('chord') as unknown as {
        gain: { linearRampToValueAtTime: ReturnType<typeof vi.fn> }
      }

      engine.previewProgression(sampleChords, 200)
      engine.stopProgressionPreview()

      // Cancelling with an owned voice must withdraw the queued note-ons through a fade.
      expect(chordKill.gain.linearRampToValueAtTime).toHaveBeenCalled()

      engine.dispose()
    } finally {
      vi.useRealTimers()
    }
  })

  it('restores unity gain before playback so a start after panic is not silenced', async () => {
    const engine = new PlaybackEngine()
    const leadKill = engine.effectsRack.getVoiceKillNode('lead') as unknown as {
      gain: { cancelScheduledValues: ReturnType<typeof vi.fn>; setValueAtTime: ReturnType<typeof vi.fn> }
    }

    engine.panic()
    leadKill.gain.cancelScheduledValues.mockClear()
    leadKill.gain.setValueAtTime.mockClear()

    await engine.play()

    expect(leadKill.gain.cancelScheduledValues).toHaveBeenCalled()
    expect(leadKill.gain.setValueAtTime).toHaveBeenCalledWith(1, expect.any(Number))

    engine.dispose()
  })

  it('releases all voices and clears the transport schedule on panic', () => {
    const engine = new PlaybackEngine()
    engine.schedule(sampleNotes, sampleChords, projectConfig)
    const lead = MockPolySynth.instances[0]
    const chord = MockPolySynth.instances[1]

    engine.panic()

    expect(transport.cancel).toHaveBeenCalled()
    expect(lead.releaseAll).toHaveBeenCalled()
    expect(chord.releaseAll).toHaveBeenCalled()
    expect(engine.generations.getActiveVoiceCount()).toBe(0)

    engine.dispose()
  })

  it('releases voices and invalidates pending callbacks when stopping', () => {
    const engine = new PlaybackEngine()
    engine.schedule(sampleNotes, sampleChords, projectConfig)
    const lead = MockPolySynth.instances[0]

    engine.stop(4)

    expect(lead.releaseAll).toHaveBeenCalled()
    expect(engine.generations.getActiveVoiceCount('transport')).toBe(0)
    expect(transport.stop).toHaveBeenCalled()

    engine.dispose()
  })

  it('updates transport position and preserves scheduled events on seekToStep', () => {
    const engine = new PlaybackEngine()
    engine.schedule(sampleNotes, sampleChords, projectConfig)
    expect(mockTransportSchedule).toHaveBeenCalledTimes(2)

    engine.seekToStep(18)
    // 18 sixteenths = bar 1, quarter 0, sixteenth 2 -> "1:0:2"
    expect(transport.position).toBe('1:0:2')
    expect(mockTransportClear).not.toHaveBeenCalled()
    engine.dispose()
  })

  it('configures loop boundaries and looping status during schedule', () => {
    const engine = new PlaybackEngine()
    const customConfig = ProjectSchema.parse({
      version: PROJECT_SCHEMA_VERSION,
      bpm: 125,
      loopStartStep: 16,
      loopEndStep: 48,
      isLooping: false
    })

    expect(() => engine.schedule(sampleNotes, sampleChords, customConfig)).not.toThrow()
    engine.dispose()
  })

  it('gives overlapping notes of the same pitch distinct voice ownership', () => {
    const engine = new PlaybackEngine()
    const generation = engine.generations.openGeneration('transport')
    const first = engine.generations.beginVoice('transport', generation, 'C4')[0]
    const second = engine.generations.beginVoice('transport', generation, 'C4')[0]

    expect(first.id).not.toBe(second.id)
    engine.generations.endVoice(first.id)
    expect(engine.generations.isVoiceActive(first.id)).toBe(false)
    expect(engine.generations.isVoiceActive(second.id)).toBe(true)

    engine.dispose()
  })

  it('does not release active voices when rescheduling during active transport playback', () => {
    const engine = new PlaybackEngine()
    transport.state = 'started'
    const lead = MockPolySynth.instances[0]
    const chord = MockPolySynth.instances[1]
    lead.releaseAll.mockClear()
    chord.releaseAll.mockClear()

    engine.schedule(sampleNotes, sampleChords, projectConfig)

    expect(lead.releaseAll).not.toHaveBeenCalled()
    expect(chord.releaseAll).not.toHaveBeenCalled()
    engine.dispose()
  })

  it('scheduleLead updates melody without clearing or touching chord transport events', () => {
    const engine = new PlaybackEngine()
    transport.state = 'started'
    mockTransportSchedule.mockClear()
    mockTransportClear.mockClear()

    // Initial full schedule: 1 note + 1 chord
    engine.schedule(sampleNotes, sampleChords, projectConfig)
    expect(mockTransportSchedule).toHaveBeenCalledTimes(2)

    mockTransportSchedule.mockClear()
    mockTransportClear.mockClear()

    // Move/update melody notes only
    const updatedNotes: AppNote[] = [{ ...sampleNotes[0], step: 8 }]
    engine.scheduleLead(updatedNotes, projectConfig)

    // Only the lead note was cleared and rescheduled (1 clear, 1 schedule)
    expect(mockTransportClear).toHaveBeenCalledTimes(1)
    expect(mockTransportSchedule).toHaveBeenCalledTimes(1)

    engine.dispose()
  })

  it('scheduleChords updates chords without clearing or touching lead transport events', () => {
    const engine = new PlaybackEngine()
    transport.state = 'started'
    mockTransportSchedule.mockClear()
    mockTransportClear.mockClear()

    // Initial full schedule: 1 note + 1 chord
    engine.schedule(sampleNotes, sampleChords, projectConfig)
    expect(mockTransportSchedule).toHaveBeenCalledTimes(2)

    mockTransportSchedule.mockClear()
    mockTransportClear.mockClear()

    // Update chords only
    const updatedChords: ChordEvent[] = [{ ...sampleChords[0], durationBars: 4 }]
    engine.scheduleChords(updatedChords, projectConfig)

    // Only the chord was cleared and rescheduled (1 clear, 1 schedule)
    expect(mockTransportClear).toHaveBeenCalledTimes(1)
    expect(mockTransportSchedule).toHaveBeenCalledTimes(1)

    engine.dispose()
  })

  it('exposes a panic action through the audio store', async () => {
    setActivePinia(createPinia())
    const store = useAudioStore()
    const engine = await store.initializeAudio()
    expect(engine).not.toBeNull()

    expect(() => store.panic()).not.toThrow()
    expect(() => store.stopProgressionPreview()).not.toThrow()
  })

  it('does not start a take audition when stopped during audio initialization', async () => {
    setActivePinia(createPinia())
    const store = useAudioStore()
    const engine = new PlaybackEngine()
    const auditionNotes = vi.spyOn(engine, 'auditionNotes')
    store.setPlaybackEngine(engine)

    const audition = store.auditionNotes(sampleNotes, 120, 'take-pending')
    expect(store.auditioningId).toBe('take-pending')
    store.stop()
    await audition

    expect(auditionNotes).not.toHaveBeenCalled()
    expect(store.auditioningId).toBeNull()
    engine.dispose()
  })
})
