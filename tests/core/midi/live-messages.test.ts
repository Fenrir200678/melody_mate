import { describe, expect, it } from 'vitest'
import { DEFAULT_MIDI_NOTE_OFF_VELOCITY } from '../../../src/config/defaults'
import {
  chordMidiNotes,
  convertMidiPitches,
  encodeNoteOff,
  encodeNoteOn,
  melodyMidiNote
} from '../../../src/core/midi/live-messages'

describe('live MIDI encoding', () => {
  it.each([
    [1, 0, 1, [0x90, 0, 1], [0x80, 0, 1]],
    [16, 127, 127, [0x9f, 127, 127], [0x8f, 127, 127]],
    [10, 60, 64, [0x99, 60, 64], [0x89, 60, 64]]
  ])('encodes channel %i and pitch %i without changing data', (channel, midi, velocity, on, off) => {
    expect(encodeNoteOn(channel, midi, velocity)).toEqual({ ok: true, value: on })
    expect(encodeNoteOff(channel, midi, velocity)).toEqual({ ok: true, value: off })
  })

  it('uses the configured release velocity and rejects zero as a normal attack', () => {
    expect(encodeNoteOff(2, 64)).toEqual({ ok: true, value: [0x81, 64, DEFAULT_MIDI_NOTE_OFF_VELOCITY] })
    expect(encodeNoteOff(2, 64, 0).ok).toBe(true)
    expect(encodeNoteOn(2, 64, 0).ok).toBe(false)
  })

  it.each([-1, 128, 256, 1.5, NaN, Infinity, -Infinity])(
    'rejects invalid data %s instead of byte wrapping',
    (invalid) => {
      expect(encodeNoteOn(1, invalid, 64).ok).toBe(false)
      expect(encodeNoteOff(1, invalid).ok).toBe(false)
      expect(encodeNoteOn(1, 60, invalid).ok).toBe(false)
      expect(encodeNoteOff(1, 60, invalid).ok).toBe(false)
    }
  )

  it.each([0, 17, 256, 1.5, NaN, Infinity, -Infinity])('rejects invalid channel %s', (channel) => {
    expect(encodeNoteOn(channel, 60, 64).ok).toBe(false)
    expect(encodeNoteOff(channel, 60).ok).toBe(false)
  })
})

describe('live MIDI pitch sources', () => {
  it('uses melody MIDI even when its display pitch disagrees', () => {
    const note = { id: 'melody-note', midi: 0, pitch: 'G9' }
    expect(melodyMidiNote(note)).toEqual({
      ok: true,
      value: {
        midi: 0,
        source: { kind: 'melody', noteId: note.id }
      }
    })
    expect(melodyMidiNote({ ...note, midi: NaN }).ok).toBe(false)
  })

  it('preserves voiced octaves, deduplicates enharmonics and orders by MIDI pitch', () => {
    const chord = { id: 'voiced-chord', voicing: ['G4', 'B#3', 'E4', 'C4', 'Cb4', 'B3', 'C5'] }
    expect(chordMidiNotes(chord)).toEqual({
      ok: true,
      value: {
        conversion: { status: 'valid', midis: [59, 60, 64, 67, 72], rejectedPitches: [] },
        notes: [59, 60, 64, 67, 72].map((midi) => ({ midi, source: { kind: 'chord', chordId: chord.id, midi } }))
      }
    })
    expect(chord.voicing).toEqual(['G4', 'B#3', 'E4', 'C4', 'Cb4', 'B3', 'C5'])
  })

  it('drops invalid preview/chord pitches without substituting C', () => {
    expect(convertMidiPitches(['C-1', 'bad', 'C', 'C10', 'G9'])).toEqual({
      status: 'partial',
      midis: [0, 127],
      rejectedPitches: ['bad', 'C', 'C10']
    })
    expect(convertMidiPitches(['bad', 'C'])).toEqual({ status: 'invalid', midis: [], rejectedPitches: ['bad', 'C'] })
    expect(convertMidiPitches([]).status).toBe('invalid')
    const result = chordMidiNotes({ id: 'invalid-voicing', voicing: ['bad'] })
    expect(result).toEqual({
      ok: true,
      value: { notes: [], conversion: { status: 'invalid', midis: [], rejectedPitches: ['bad'] } }
    })
  })
})
