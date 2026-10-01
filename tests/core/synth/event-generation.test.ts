import { describe, expect, it } from 'vitest'
import { createEventGenerationTracker } from '../../../src/core/synth/event-generation'

describe('EventGenerationTracker', () => {
  it('invalidates future callbacks of a session on stop, pause or seek', () => {
    const tracker = createEventGenerationTracker()
    const captured = tracker.openGeneration('transport')

    expect(tracker.isCurrent('transport', captured)).toBe(true)
    const generation = tracker.invalidate('transport')

    expect(generation).toBeGreaterThan(captured)
    expect(tracker.isCurrent('transport', captured)).toBe(false)
  })

  it('never starts a note for a generation that was cancelled', () => {
    const tracker = createEventGenerationTracker()
    const captured = tracker.openGeneration('progression-preview')
    tracker.invalidate('progression-preview')

    expect(tracker.beginVoice('progression-preview', captured, 'C4')).toEqual([])
    expect(tracker.getActiveVoiceCount()).toBe(0)
  })

  it('scopes invalidation to a single session', () => {
    const tracker = createEventGenerationTracker()
    const transport = tracker.openGeneration('transport')
    const preview = tracker.openGeneration('chord-preview')

    tracker.invalidate('transport')

    expect(tracker.isCurrent('transport', transport)).toBe(false)
    expect(tracker.isCurrent('chord-preview', preview)).toBe(true)
  })

  it('owns a voice only while its generation is current', () => {
    const tracker = createEventGenerationTracker()
    const generation = tracker.openGeneration('transport')
    const handle = tracker.beginVoice('transport', generation, 'C4')[0]

    expect(tracker.ownsVoice(handle)).toBe(true)
    tracker.invalidate('transport')
    expect(tracker.ownsVoice(handle)).toBe(false)
  })

  it('gives overlapping notes of the same pitch distinct ownership', () => {
    const tracker = createEventGenerationTracker()
    const generation = tracker.openGeneration('transport')
    const first = tracker.beginVoice('transport', generation, 'C4')[0]
    const second = tracker.beginVoice('transport', generation, 'C4')[0]

    expect(first.id).not.toBe(second.id)
    expect(first.sequence).not.toBe(second.sequence)
    expect(tracker.getActiveVoiceCount('transport')).toBe(2)

    // Releasing the first note must not steal the second note's voice.
    tracker.endVoice(first.id)
    expect(tracker.isVoiceActive(first.id)).toBe(false)
    expect(tracker.isVoiceActive(second.id)).toBe(true)
    expect(tracker.ownsVoice(second)).toBe(true)
  })

  it('keeps voice IDs unique across sessions and generations', () => {
    const tracker = createEventGenerationTracker()
    const transport = tracker.beginVoice('transport', tracker.openGeneration('transport'), 'C4')[0]
    const preview = tracker.beginVoice('chord-preview', tracker.openGeneration('chord-preview'), 'C4')[0]

    expect(transport.id).not.toBe(preview.id)

    tracker.invalidate('transport')
    const afterStop = tracker.beginVoice('transport', tracker.openGeneration('transport'), 'C4')[0]
    expect(afterStop.id).not.toBe(transport.id)
    expect(afterStop.sessionId).toBeGreaterThan(transport.sessionId)
  })

  it('releases only the voices of one session', () => {
    const tracker = createEventGenerationTracker()
    const transport = tracker.beginVoice('transport', tracker.openGeneration('transport'), 'C4')[0]
    const preview = tracker.beginVoice('chord-preview', tracker.openGeneration('chord-preview'), 'E4')[0]

    const released = tracker.releaseSession('transport')

    expect(released.map((voice) => voice.id)).toEqual([transport.id])
    expect(tracker.isVoiceActive(transport.id)).toBe(false)
    expect(tracker.isVoiceActive(preview.id)).toBe(true)
  })

  it('drops stale voices from a cancelled session without reporting them', () => {
    const tracker = createEventGenerationTracker()
    const handle = tracker.beginVoice('transport', tracker.openGeneration('transport'), 'C4')[0]

    tracker.invalidate('transport')

    expect(tracker.releaseSession('transport')).toEqual([])
    expect(tracker.isVoiceActive(handle.id)).toBe(false)
  })

  it('releases every session and invalidates all generations on panic', () => {
    const tracker = createEventGenerationTracker()
    const transportGeneration = tracker.openGeneration('transport')
    const previewGeneration = tracker.openGeneration('note-audition')
    tracker.beginVoice('transport', transportGeneration, 'C4')
    tracker.beginVoice('note-audition', previewGeneration, 'E4')

    const released = tracker.releaseAll()

    expect(released).toHaveLength(2)
    expect(tracker.getActiveVoiceCount()).toBe(0)
    expect(tracker.isCurrent('transport', transportGeneration)).toBe(false)
    expect(tracker.isCurrent('note-audition', previewGeneration)).toBe(false)
  })

  it('bounds ownership through explicit note expiry', () => {
    const tracker = createEventGenerationTracker()
    const handle = tracker.beginVoice('transport', tracker.openGeneration('transport'), 'C4')[0]

    expect(tracker.isVoiceActive(handle.id)).toBe(true)
    expect(tracker.endVoice(handle.id)).toBe(true)
    expect(tracker.endVoice(handle.id)).toBe(false)
    expect(tracker.getActiveVoiceCount()).toBe(0)
  })

  it('creates voices per requested count for chords', () => {
    const tracker = createEventGenerationTracker()
    const handles = tracker.beginVoice('transport', tracker.openGeneration('transport'), 'C4,E4,G4', 3)

    expect(handles).toHaveLength(3)
    expect(new Set(handles.map((handle) => handle.id)).size).toBe(3)
    expect(tracker.getActiveVoiceCount('transport')).toBe(3)
  })
})
