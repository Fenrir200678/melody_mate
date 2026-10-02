import { describe, expect, it } from 'vitest'
import { DEFAULT_MIDI_OUTPUT_SETTINGS, MIDI_OUTPUT_BOUNDS } from '../../../src/config/defaults'
import {
  MidiNoteIntentSchema,
  MidiOutputSettingsSchema,
  validateMidiRouteConflict
} from '../../../src/core/midi/output.schema'
import type { MidiNoteIntent, MidiOutputSettings, OutputRouteMode } from '../../../src/core/midi/output.types'

function routes(leadMode: OutputRouteMode = 'midi', chordMode: OutputRouteMode = 'both'): MidiOutputSettings {
  const port = { id: 'shared-port', name: 'IAC Bus', manufacturer: null }
  return {
    lead: { mode: leadMode, port: { ...port }, channel: 3, offsetMs: -8, sendPreviews: true },
    chord: { mode: chordMode, port: { ...port }, channel: 4, offsetMs: 8, sendPreviews: false }
  }
}

function intent(): MidiNoteIntent {
  return {
    track: 'lead',
    source: { kind: 'melody', noteId: 'note-a' },
    sessionId: 'transport-a',
    generation: 3,
    loopIteration: 2,
    eventId: 'event-a',
    portId: 'port-a',
    channel: 16,
    midi: 127,
    velocity: 100,
    onTimeMs: 1000,
    offTimeMs: 1500
  }
}

describe('MIDI routing contract', () => {
  it('hydrates independent tracks from central defaults', () => {
    const first = MidiOutputSettingsSchema.parse({})
    expect(first).toEqual(DEFAULT_MIDI_OUTPUT_SETTINGS)
    first.lead.channel = 5
    expect(MidiOutputSettingsSchema.parse({})).toEqual(DEFAULT_MIDI_OUTPUT_SETTINGS)
    expect(MidiOutputSettingsSchema.parse({ lead: { mode: 'both' } }).lead).toEqual({
      ...DEFAULT_MIDI_OUTPUT_SETTINGS.lead,
      mode: 'both'
    })
  })

  it.each(['internal', 'midi', 'both'] as const)('checks conflicts for lead mode %s', (mode) => {
    const settings = routes(mode)
    expect(MidiOutputSettingsSchema.safeParse(settings).success).toBe(true)
    settings.chord.channel = settings.lead.channel
    expect(Boolean(validateMidiRouteConflict(settings))).toBe(mode !== 'internal')
    expect(MidiOutputSettingsSchema.safeParse(settings).success).toBe(mode === 'internal')
    settings.chord.mode = 'internal'
    expect(MidiOutputSettingsSchema.safeParse(settings).success).toBe(true)
  })

  it('compares port IDs, allows different ports and retains unresolved desired routes', () => {
    const settings = routes()
    settings.chord.channel = settings.lead.channel
    settings.chord.port!.id = 'other-port'
    expect(MidiOutputSettingsSchema.safeParse(settings).success).toBe(true)
    settings.chord.port = null
    expect(MidiOutputSettingsSchema.safeParse(settings).success).toBe(true)
  })

  it.each([NaN, Infinity, -Infinity, MIDI_OUTPUT_BOUNDS.offsetMs.min - 1, MIDI_OUTPUT_BOUNDS.offsetMs.max + 1])(
    'rejects offset %s',
    (offsetMs) => {
      const settings = routes()
      settings.lead.offsetMs = offsetMs
      expect(MidiOutputSettingsSchema.safeParse(settings).success).toBe(false)
    }
  )

  it('accepts configured offset bounds and rejects runtime state or malformed port references', () => {
    const settings = routes()
    settings.lead.offsetMs = MIDI_OUTPUT_BOUNDS.offsetMs.min
    settings.chord.offsetMs = MIDI_OUTPUT_BOUNDS.offsetMs.max
    expect(MidiOutputSettingsSchema.safeParse(settings).success).toBe(true)
    expect(MidiOutputSettingsSchema.safeParse({ ...settings, enabled: true }).success).toBe(false)
    expect(
      MidiOutputSettingsSchema.safeParse({ lead: { port: { id: ' ', name: null, manufacturer: null } } }).success
    ).toBe(false)
    expect(MidiOutputSettingsSchema.safeParse({ lead: { port: [] } }).success).toBe(false)
    expect(MidiOutputSettingsSchema.safeParse({ lead: { mode: 'external' } }).success).toBe(false)
    expect(MidiOutputSettingsSchema.safeParse({ lead: { channel: 0 } }).success).toBe(false)
    expect(MidiOutputSettingsSchema.safeParse({ chord: { channel: 17 } }).success).toBe(false)
  })
})

describe('MIDI note intent ownership and validation', () => {
  it('retains source identity across distinct sessions, generations and loop instances', () => {
    const first = MidiNoteIntentSchema.parse(intent())
    const next = MidiNoteIntentSchema.parse({
      ...first,
      sessionId: 'transport-b',
      generation: 4,
      loopIteration: 3,
      eventId: 'event-b'
    })
    expect(next.source).toEqual(first.source)
    expect(next).not.toEqual(first)
    expect(
      MidiNoteIntentSchema.safeParse({
        ...first,
        track: 'chord',
        source: { kind: 'chord', chordId: 'chord-a', midi: 127 }
      }).success
    ).toBe(true)
    expect(
      MidiNoteIntentSchema.safeParse({ ...first, source: { kind: 'preview', sourceId: 'audition-a' } }).success
    ).toBe(true)
  })

  it.each([
    { offTimeMs: 1000 },
    { offTimeMs: 999 },
    { onTimeMs: NaN },
    { offTimeMs: Infinity },
    { velocity: 0 },
    { midi: 128 },
    { channel: 1.5 },
    { generation: -1 },
    { loopIteration: 0.5 },
    { eventId: '' },
    { sessionId: ' ' },
    { portId: '' },
    { track: 'melody' },
    { source: { kind: 'melody', noteId: '' } },
    { track: 'chord' },
    { source: { kind: 'chord', chordId: 'chord-a', midi: 126 }, track: 'chord' }
  ])('rejects malformed intent %j', (override) => {
    expect(MidiNoteIntentSchema.safeParse({ ...intent(), ...override }).success).toBe(false)
  })
})
