import { describe, expect, it } from 'vitest'
import {
  compareMidiQueueEvents,
  matchesMidiScope,
  reconcileMidiNotes,
  retriggerMidiNotes
} from '../../../src/core/midi/note-ownership'
import type { MidiNoteIntent, MidiNoteSource } from '../../../src/core/midi/output.types'

const intent = (overrides: Partial<MidiNoteIntent> = {}): MidiNoteIntent => ({
  track: 'lead',
  source: { kind: 'melody', noteId: 'melody-a' },
  sessionId: 'transport-a',
  generation: 1,
  loopIteration: 1,
  eventId: 'event-a',
  portId: 'port-a',
  channel: 1,
  midi: 60,
  velocity: 96,
  onTimeMs: 1_000,
  offTimeMs: 1_500,
  ...overrides
})

describe('MIDI note ownership', () => {
  it('matches optional track, session, generation, loop, and stable source scopes', () => {
    const note = intent()
    expect(matchesMidiScope(note, { track: 'lead', sessionId: 'transport-a', generation: 1 })).toBe(true)
    expect(matchesMidiScope(note, { track: 'chord' })).toBe(false)
    expect(matchesMidiScope(note, { sessionId: 'transport-b' })).toBe(false)
    expect(matchesMidiScope(note, { generation: 2 })).toBe(false)
    expect(matchesMidiScope(note, { loopIteration: 2 })).toBe(false)
    expect(matchesMidiScope(note, { source: { kind: 'melody', noteId: 'melody-b' } })).toBe(false)
  })

  it('retains potentially active unchanged sources through generation reconciliation only', () => {
    const activeUnchanged = intent({ eventId: 'active-old-generation', generation: 2, onTimeMs: 900, offTimeMs: 1_300 })
    const futureUnchanged = intent({ eventId: 'future-unchanged', generation: 2, onTimeMs: 1_800, offTimeMs: 2_100 })
    const activeMuted = intent({
      eventId: 'active-muted',
      generation: 2,
      source: { kind: 'melody', noteId: 'melody-muted' },
      onTimeMs: 900,
      offTimeMs: 1_300
    })
    const chord = intent({
      track: 'chord',
      source: { kind: 'chord', chordId: 'chord-a', midi: 60 },
      eventId: 'chord-session',
      sessionId: 'chord-session',
      generation: 2
    })
    const retainedSource: MidiNoteSource = { kind: 'melody', noteId: 'melody-a' }
    const notes = [activeUnchanged, futureUnchanged, activeMuted, chord]
    expect(
      reconcileMidiNotes(notes, { track: 'lead' }, [retainedSource], new Set(['active-old-generation', 'active-muted']))
    ).toEqual(['future-unchanged', 'active-muted'])
    expect(reconcileMidiNotes(notes, { track: 'lead' }, [retainedSource], new Set())).toEqual([
      'active-old-generation',
      'future-unchanged',
      'active-muted'
    ])
  })

  it('clips an earlier note when a later same-pitch retrigger arrives first', () => {
    const later = intent({ eventId: 'later', onTimeMs: 1_200, offTimeMs: 1_600 })
    const earlier = intent({ eventId: 'earlier', onTimeMs: 1_000, offTimeMs: 1_500 })
    const result = retriggerMidiNotes([later], earlier)
    expect(result).toEqual([later, { ...earlier, offTimeMs: 1_200 }])
  })

  it('clips an active earlier note and caps a new retrigger at the next queued attack', () => {
    const earlier = intent({ eventId: 'earlier', onTimeMs: 1_000, offTimeMs: 1_700 })
    const later = intent({ eventId: 'later', onTimeMs: 1_600, offTimeMs: 1_900 })
    const incoming = intent({ eventId: 'incoming', onTimeMs: 1_300, offTimeMs: 2_000 })
    expect(retriggerMidiNotes([later, earlier], incoming)).toEqual([
      later,
      { ...earlier, offTimeMs: 1_300 },
      { ...incoming, offTimeMs: 1_600 }
    ])
  })

  it('does not merge different channels or pitches and orders same-time releases before attacks', () => {
    const base = intent()
    const otherChannel = intent({ eventId: 'other-channel', channel: 2, onTimeMs: 1_300, offTimeMs: 1_800 })
    const otherPitch = intent({ eventId: 'other-pitch', midi: 61, onTimeMs: 1_300, offTimeMs: 1_800 })
    const incoming = intent({ eventId: 'incoming', onTimeMs: 1_300, offTimeMs: 1_700 })
    expect(retriggerMidiNotes([base, otherChannel, otherPitch], incoming)).toEqual([
      { ...base, offTimeMs: 1_300 },
      otherChannel,
      otherPitch,
      incoming
    ])
    const off = { note: base, kind: 'off' as const, timeMs: 1_300 }
    const on = { note: incoming, kind: 'on' as const, timeMs: 1_300 }
    expect(compareMidiQueueEvents(off, on)).toBeLessThan(0)
    expect(compareMidiQueueEvents(on, off)).toBeGreaterThan(0)
  })
})
