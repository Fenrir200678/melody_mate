import { describe, expect, it } from 'vitest'
import {
  buildChordTrack,
  buildLeadTrack,
  buildMidiBlob,
  buildMidiBytes,
  formatScaleSlug,
  generateMidiFilename,
  TICKS_PER_BAR,
  TICKS_PER_SIXTEENTH
} from '../../../src/core/midi/midi-exporter'
import { downloadMidiFile } from '../../../src/services/midi-download'
import { getGroovedStartStep } from '../../../src/core/rhythm/groove'
import type { ChordEvent } from '../../../src/core/schemas/chord.schema'
import type { AppNote } from '../../../src/core/schemas/note.schema'

describe('multi-track MIDI exporter', () => {
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
      durationSteps: 4,
      velocity: 80,
      isMuted: false
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      pitch: 'G4',
      midi: 67,
      step: 8,
      durationSteps: 2,
      velocity: 90,
      isMuted: true // Should be filtered out
    }
  ]

  const sampleChords: ChordEvent[] = [
    {
      id: '44444444-4444-4444-8444-444444444444',
      name: 'Am',
      roman: 'vi',
      notes: ['A', 'C', 'E'],
      voicing: ['A3', 'C4', 'E4'],
      startBar: 0,
      durationBars: 2
    },
    {
      id: '55555555-5555-4555-8555-555555555555',
      name: 'F',
      roman: 'IV',
      notes: ['F3', 'A3', 'C4'],
      voicing: ['F3', 'A3', 'C4'],
      startBar: 2,
      durationBars: 2
    }
  ]

  function countTrackChunks(bytes: Uint8Array): number {
    let count = 0
    for (let i = 0; i < bytes.length - 3; i++) {
      if (
        bytes[i] === 0x4d && // M
        bytes[i + 1] === 0x54 && // T
        bytes[i + 2] === 0x72 && // r
        bytes[i + 3] === 0x6b // k
      ) {
        count++
      }
    }
    return count
  }

  it('generates valid Standard MIDI file header (MThd)', () => {
    const bytes = buildMidiBytes(sampleNotes, sampleChords, 120, 'full')

    expect(bytes.length).toBeGreaterThan(14)
    // First 4 bytes must be 'MThd' (0x4D, 0x54, 0x68, 0x64)
    expect(bytes[0]).toBe(0x4d)
    expect(bytes[1]).toBe(0x54)
    expect(bytes[2]).toBe(0x68)
    expect(bytes[3]).toBe(0x64)
  })

  it('exports full multi-track layout with exactly 2 tracks (Lead + Chords)', () => {
    const bytes = buildMidiBytes(sampleNotes, sampleChords, 120, 'full')
    const trackCount = countTrackChunks(bytes)
    expect(trackCount).toBe(2)
  })

  it('exports melody-only mode with 1 track', () => {
    const bytes = buildMidiBytes(sampleNotes, sampleChords, 120, 'melody-only')
    const trackCount = countTrackChunks(bytes)
    expect(trackCount).toBe(1)
  })

  it('exports chords-only mode with 1 track', () => {
    const bytes = buildMidiBytes(sampleNotes, sampleChords, 120, 'chords-only')
    const trackCount = countTrackChunks(bytes)
    expect(trackCount).toBe(1)
  })

  it('filters out muted notes in lead track', () => {
    // sampleNotes has 3 notes, but the 3rd is muted
    const bytesWithMuted = buildMidiBytes(sampleNotes, [], 120, 'melody-only')
    const activeNotesOnly = sampleNotes.filter((n) => !n.isMuted)
    const bytesActiveOnly = buildMidiBytes(activeNotesOnly, [], 120, 'melody-only')

    expect(bytesWithMuted.length).toBeGreaterThan(0)
    expect(bytesWithMuted).toEqual(bytesActiveOnly)
  })

  interface InspectableNoteEvent {
    name?: string
    channel?: number
    tick?: number
    duration?: string
  }

  it('assigns Channel 1 to Lead notes and Channel 2 to Chords', () => {
    const leadTrack = buildLeadTrack(sampleNotes, 120)
    const chordTrack = buildChordTrack(sampleChords, 120)

    const leadNoteEvents = (leadTrack.explicitTickEvents as unknown as InspectableNoteEvent[]).filter(
      (e) => e.name === 'NoteEvent'
    )
    for (const event of leadNoteEvents) {
      expect(event.channel).toBe(1)
    }

    const chordNoteEvents = (chordTrack.explicitTickEvents as unknown as InspectableNoteEvent[]).filter(
      (e) => e.name === 'NoteEvent'
    )
    for (const event of chordNoteEvents) {
      expect(event.channel).toBe(2)
    }
  })

  it('handles non-integer steps and durations by rounding ticks cleanly', () => {
    const floatNotes: AppNote[] = [
      {
        id: '99999999-9999-4999-8999-999999999999',
        pitch: 'D4',
        midi: 62,
        step: 1.333,
        durationSteps: 2.667,
        velocity: 95,
        isMuted: false
      }
    ]

    const track = buildLeadTrack(floatNotes, 120)
    const noteEvent = track.explicitTickEvents[0] as unknown as InspectableNoteEvent
    expect(noteEvent.tick).toBe(Math.round(1.333 * TICKS_PER_SIXTEENTH))
    expect(noteEvent.duration).toBe(`T${Math.round(2.667 * TICKS_PER_SIXTEENTH)}`)
  })

  it('maps tick constants correctly', () => {
    expect(TICKS_PER_SIXTEENTH).toBe(32)
    expect(TICKS_PER_BAR).toBe(512)
  })

  it('exports the same swing offset used by project groove', () => {
    const track = buildLeadTrack([{ ...sampleNotes[0], step: 1 }], 120, undefined, undefined, {
      bpm: 120,
      swing: 1,
      timingLooseness: 0
    })
    const event = track.explicitTickEvents[0] as unknown as InspectableNoteEvent
    expect(event.tick).toBe(Math.round((1 + 1 / 3) * TICKS_PER_SIXTEENTH))
  })

  it('exports triplet eighth-note timing for an eighth-grid offbeat', () => {
    const track = buildLeadTrack([{ ...sampleNotes[0], step: 2 }], 120, undefined, undefined, {
      bpm: 120,
      swing: 1,
      timingLooseness: 0
    })
    const event = track.explicitTickEvents[0] as unknown as InspectableNoteEvent

    expect(event.tick).toBe(Math.round((2 + 2 / 3) * TICKS_PER_SIXTEENTH))
  })

  it('exports stable project timing looseness in note ticks', () => {
    const groove = { bpm: 120, swing: 0, timingLooseness: 1 }
    const note = { ...sampleNotes[0], id: 'late-timing-note', step: 1 }
    const track = buildLeadTrack([note], 120, undefined, undefined, groove)
    const event = track.explicitTickEvents[0] as unknown as InspectableNoteEvent

    expect(event.tick).toBe(Math.round(getGroovedStartStep(1, note.id, groove) * TICKS_PER_SIXTEENTH))
    expect(event.tick).not.toBe(TICKS_PER_SIXTEENTH)
  })

  it('exports project steps and durations in sixteenth-note coordinates', () => {
    const track = buildLeadTrack([{ ...sampleNotes[0], step: 1 }], 120, undefined, undefined, {
      bpm: 120,
      swing: 0,
      timingLooseness: 0
    })
    const event = track.explicitTickEvents[0] as unknown as InspectableNoteEvent
    expect(event.tick).toBe(32)
    expect(event.duration).toBe('T64')
  })

  it('voices chords with missing octaves cleanly', () => {
    const track = buildChordTrack(sampleChords, 120)
    expect(track).toBeDefined()
  })

  it('creates audio/midi Blob with correct mime type and accepts export options object', () => {
    const blob = buildMidiBlob(sampleNotes, sampleChords, 120, {
      mode: 'full',
      key: 'C',
      scale: 'minor'
    })
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('audio/midi')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('handles empty notes and empty chords gracefully', () => {
    const bytesEmpty = buildMidiBytes([], [], 120, 'full')
    expect(bytesEmpty.length).toBeGreaterThan(0)
    expect(countTrackChunks(bytesEmpty)).toBe(2)
  })

  it('safe download function in headless environment', () => {
    const blob = buildMidiBlob(sampleNotes, sampleChords, 120, 'full')
    expect(() => downloadMidiFile(blob, 'test-song')).not.toThrow()
  })

  describe('filename and scale slug generation', () => {
    it('formats scale slugs into clean abbreviations', () => {
      expect(formatScaleSlug('major')).toBe('maj')
      expect(formatScaleSlug('minor')).toBe('min')
      expect(formatScaleSlug('mixolydian')).toBe('mixo')
      expect(formatScaleSlug('harmonic_minor')).toBe('harm-min')
      expect(formatScaleSlug('pentatonic_minor')).toBe('p-min')
      expect(formatScaleSlug('custom exotic scale')).toBe('custom-exotic-scale')
    })

    it('generates standard producer pack filename for all export modes', () => {
      const leadName = generateMidiFilename({
        key: 'C',
        scale: 'minor',
        bpm: 124,
        bars: 4,
        mode: 'melody-only'
      })
      expect(leadName).toBe('MelodyMate_Cmin_124BPM_4bar_Lead.mid')

      const chordsName = generateMidiFilename({
        key: 'F#',
        scale: 'dorian',
        bpm: 120,
        bars: 8,
        mode: 'chords-only'
      })
      expect(chordsName).toBe('MelodyMate_F#dorian_120BPM_8bar_Chords.mid')

      const fullName = generateMidiFilename({
        key: 'Bb',
        scale: 'major',
        bpm: 95.4,
        bars: 4,
        mode: 'full'
      })
      expect(fullName).toBe('MelodyMate_Bbmaj_95BPM_4bar_MultiTrack.mid')
    })

    it('honors custom prefix when provided', () => {
      const customName = generateMidiFilename({
        key: 'A',
        scale: 'minor',
        bpm: 128,
        bars: 2,
        mode: 'melody-only',
        prefix: 'NeonGroove'
      })
      expect(customName).toBe('NeonGroove_Amin_128BPM_2bar_Lead.mid')
    })
  })
})
