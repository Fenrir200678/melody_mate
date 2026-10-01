import { describe, expect, it } from 'vitest'
import {
  getPentatonicEquivalent,
  getScaleDegree,
  getScaleNotes,
  isNoteInScale,
  midiToPitch,
  normalizeEnharmonic,
  pitchToMidi,
  snapMidiToScale,
  snapPitchToScale,
  SUPPORTED_SCALES,
  transposeMidiInScale
} from '@/core/theory/scale.engine'

describe('Scale Engine', () => {
  describe('SUPPORTED_SCALES', () => {
    it('should define all 21 supported scales', () => {
      expect(SUPPORTED_SCALES).toHaveLength(21)
      const ids = SUPPORTED_SCALES.map((s) => s.id)
      expect(ids).toContain('major')
      expect(ids).toContain('minor')
      expect(ids).toContain('harmonic minor')
      expect(ids).toContain('melodic minor')
      expect(ids).toContain('dorian')
      expect(ids).toContain('phrygian')
      expect(ids).toContain('lydian')
      expect(ids).toContain('mixolydian')
      expect(ids).toContain('locrian')
      expect(ids).toContain('bebop major')
      expect(ids).toContain('bebop minor')
      expect(ids).toContain('blues')
      expect(ids).toContain('major pentatonic')
      expect(ids).toContain('minor pentatonic')
      expect(ids).toContain('whole tone')
      expect(ids).toContain('whole-half diminished')
      expect(ids).toContain('half-whole diminished')
      expect(ids).toContain('hungarian minor')
      expect(ids).toContain('phrygian dominant')
      expect(ids).toContain('double harmonic major')
      expect(ids).toContain('ichikosucho')
    })

    it('should successfully resolve notes for all 21 scales', () => {
      for (const scale of SUPPORTED_SCALES) {
        const notes = getScaleNotes('C', scale.id)
        expect(notes.length).toBeGreaterThan(4)
        expect(notes[0]).toBe('C')
      }
    })
  })

  describe('getScaleNotes', () => {
    it('should return correct pitch classes for C Major', () => {
      expect(getScaleNotes('C', 'major')).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    })

    it('should return correct pitch classes for A Minor', () => {
      expect(getScaleNotes('A', 'minor')).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
    })

    it('should return correct pitch classes for C Dorian', () => {
      expect(getScaleNotes('C', 'dorian')).toEqual(['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'])
    })

    it('should return correct pitch classes for C Blues', () => {
      expect(getScaleNotes('C', 'blues')).toEqual(['C', 'Eb', 'F', 'Gb', 'G', 'Bb'])
    })

    it('should return correct pitch classes for C Major Pentatonic', () => {
      expect(getScaleNotes('C', 'major pentatonic')).toEqual(['C', 'D', 'E', 'G', 'A'])
    })

    it('should return notes with octaves if root has octave', () => {
      expect(getScaleNotes('C4', 'major')).toEqual(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'])
    })
  })

  describe('isNoteInScale', () => {
    it('should return true for diatonic notes in major scale', () => {
      expect(isNoteInScale('C', 'C', 'major')).toBe(true)
      expect(isNoteInScale('E4', 'C', 'major')).toBe(true)
      expect(isNoteInScale('B5', 'C', 'major')).toBe(true)
    })

    it('should return false for chromatic / non-scale notes', () => {
      expect(isNoteInScale('F#', 'C', 'major')).toBe(false)
      expect(isNoteInScale('C#4', 'C', 'major')).toBe(false)
      expect(isNoteInScale('Ab3', 'C', 'major')).toBe(false)
    })

    it('should handle enharmonic equivalences correctly', () => {
      // D major contains F#; Gb has the same chroma
      expect(isNoteInScale('Gb', 'D', 'major')).toBe(true)
      expect(isNoteInScale('F#', 'D', 'major')).toBe(true)
    })
  })

  describe('getScaleDegree', () => {
    it('should return 1-based degrees for C Major', () => {
      expect(getScaleDegree('C', 'C', 'major')).toBe(1)
      expect(getScaleDegree('D', 'C', 'major')).toBe(2)
      expect(getScaleDegree('E4', 'C', 'major')).toBe(3)
      expect(getScaleDegree('F4', 'C', 'major')).toBe(4)
      expect(getScaleDegree('G', 'C', 'major')).toBe(5)
      expect(getScaleDegree('A', 'C', 'major')).toBe(6)
      expect(getScaleDegree('B', 'C', 'major')).toBe(7)
    })

    it('should return null for out-of-scale notes', () => {
      expect(getScaleDegree('C#', 'C', 'major')).toBeNull()
      expect(getScaleDegree('F#4', 'C', 'major')).toBeNull()
      expect(getScaleDegree('Bb3', 'C', 'major')).toBeNull()
    })
  })

  describe('pitchToMidi and midiToPitch', () => {
    it('should convert standard pitches to MIDI numbers', () => {
      expect(pitchToMidi('C4')).toBe(60)
      expect(pitchToMidi('A4')).toBe(69)
      expect(pitchToMidi('C-1')).toBe(0)
      expect(pitchToMidi('G9')).toBe(127)
    })

    it('should default bare pitch class to octave 4', () => {
      expect(pitchToMidi('C')).toBe(60)
      expect(pitchToMidi('A')).toBe(69)
    })

    it('should convert MIDI numbers to pitch strings', () => {
      expect(midiToPitch(60)).toBe('C4')
      expect(midiToPitch(69)).toBe('A4')
    })
  })

  describe('snapPitchToScale', () => {
    it('should preserve notes that are already in scale', () => {
      expect(snapPitchToScale('C4', 'C', 'major')).toBe('C4')
      expect(snapPitchToScale('E4', 'C', 'major')).toBe('E4')
      expect(snapPitchToScale('G4', 'C', 'major')).toBe('G4')
    })

    it('should snap accidental notes to the closest scale degree', () => {
      // C#4 (61) is 1 semitone from C4 (60) and D4 (62). Resolves to C4.
      expect(snapPitchToScale('C#4', 'C', 'major')).toBe('C4')
      // D#4 (63) is 1 semitone from D4 (62) and E4 (64). Resolves to D4.
      expect(snapPitchToScale('D#4', 'C', 'major')).toBe('D4')
      // F#4 (66) is 1 semitone from F4 (65) and G4 (67). Resolves to F4.
      expect(snapPitchToScale('F#4', 'C', 'major')).toBe('F4')
    })

    it('should snap bare pitch classes without octaves', () => {
      expect(snapPitchToScale('C#', 'C', 'major')).toBe('C')
    })
  })

  describe('snapMidiToScale', () => {
    it('should preserve MIDI numbers that are already in scale', () => {
      expect(snapMidiToScale(60, 'C', 'major')).toBe(60) // C4
      expect(snapMidiToScale(62, 'C', 'major')).toBe(62) // D4
      expect(snapMidiToScale(67, 'C', 'major')).toBe(67) // G4
    })

    it('should snap chromatic MIDI numbers to the closest scale degree (ties resolve downward)', () => {
      expect(snapMidiToScale(61, 'C', 'major')).toBe(60) // C#4 -> C4
      expect(snapMidiToScale(63, 'C', 'major')).toBe(62) // D#4 -> D4
      expect(snapMidiToScale(66, 'C', 'major')).toBe(65) // F#4 -> F4
    })

    it('should preserve the octave/register of the input', () => {
      expect(snapMidiToScale(73, 'C', 'major')).toBe(72) // C#5 -> C5
      expect(snapMidiToScale(49, 'C', 'major')).toBe(48) // C#3 -> C3
    })

    it('should always return an in-scale MIDI number across the piano-roll range', () => {
      for (let midi = 36; midi <= 84; midi++) {
        const snapped = snapMidiToScale(midi, 'A', 'minor')
        expect(isNoteInScale(midiToPitch(snapped), 'A', 'minor')).toBe(true)
      }
    })
  })

  describe('getPentatonicEquivalent', () => {
    it('should map major scales and modes to major pentatonic', () => {
      expect(getPentatonicEquivalent('major')).toBe('major pentatonic')
      expect(getPentatonicEquivalent('lydian')).toBe('major pentatonic')
      expect(getPentatonicEquivalent('mixolydian')).toBe('major pentatonic')
      expect(getPentatonicEquivalent('major pentatonic')).toBe('major pentatonic')
    })

    it('should map minor scales and modes to minor pentatonic', () => {
      expect(getPentatonicEquivalent('minor')).toBe('minor pentatonic')
      expect(getPentatonicEquivalent('dorian')).toBe('minor pentatonic')
      expect(getPentatonicEquivalent('phrygian')).toBe('minor pentatonic')
      expect(getPentatonicEquivalent('locrian')).toBe('minor pentatonic')
      expect(getPentatonicEquivalent('harmonic minor')).toBe('minor pentatonic')
      expect(getPentatonicEquivalent('minor pentatonic')).toBe('minor pentatonic')
      expect(getPentatonicEquivalent('blues')).toBe('minor pentatonic')
    })
  })

  describe('normalizeEnharmonic', () => {
    it('folds flat spellings onto their sharp equivalents', () => {
      expect(normalizeEnharmonic('Db3')).toBe('C#3')
      expect(normalizeEnharmonic('Eb')).toBe('D#')
      expect(normalizeEnharmonic('Gb2')).toBe('F#2')
      expect(normalizeEnharmonic('Ab')).toBe('G#')
      expect(normalizeEnharmonic('Bb4')).toBe('A#4')
    })

    it('resolves theoretically valid but impractical spellings', () => {
      expect(normalizeEnharmonic('E#3')).toBe('F3')
      expect(normalizeEnharmonic('B#2')).toBe('C2')
      expect(normalizeEnharmonic('Cb4')).toBe('B4')
      expect(normalizeEnharmonic('Fb3')).toBe('E3')
    })

    it('leaves sharp and natural spellings untouched', () => {
      expect(normalizeEnharmonic('C#5')).toBe('C#5')
      expect(normalizeEnharmonic('C4')).toBe('C4')
    })

    it('returns unparseable input unchanged instead of throwing', () => {
      expect(normalizeEnharmonic('X9')).toBe('X9')
      expect(normalizeEnharmonic('')).toBe('')
    })
  })

  describe('transposeMidiInScale', () => {
    it('returns same midi if steps is 0', () => {
      expect(transposeMidiInScale(60, 0, 'C', 'major')).toBe(60)
    })

    it('transposes up by scale degrees in C Major', () => {
      expect(transposeMidiInScale(60, 1, 'C', 'major')).toBe(62) // C4 -> D4
      expect(transposeMidiInScale(62, 1, 'C', 'major')).toBe(64) // D4 -> E4
      expect(transposeMidiInScale(64, 1, 'C', 'major')).toBe(65) // E4 -> F4
      expect(transposeMidiInScale(71, 1, 'C', 'major')).toBe(72) // B4 -> C5
    })

    it('transposes down by scale degrees in C Major', () => {
      expect(transposeMidiInScale(62, -1, 'C', 'major')).toBe(60) // D4 -> C4
      expect(transposeMidiInScale(65, -1, 'C', 'major')).toBe(64) // F4 -> E4
      expect(transposeMidiInScale(60, -1, 'C', 'major')).toBe(59) // C4 -> B3
    })

    it('steps to nearest valid scale degree when starting from an accidental', () => {
      // 61 is C#4. In C major, next scale degree up is D4 (62), previous down is C4 (60)
      expect(transposeMidiInScale(61, 1, 'C', 'major')).toBe(62)
      expect(transposeMidiInScale(61, -1, 'C', 'major')).toBe(60)
    })

    it('clamps cleanly at MIDI boundaries (0 and 127)', () => {
      expect(transposeMidiInScale(127, 1, 'C', 'major')).toBe(127)
      expect(transposeMidiInScale(0, -1, 'C', 'major')).toBe(0)
    })
  })
})
