import { describe, expect, it } from 'vitest'
import { applyVoicingStyle } from '@/core/theory/chord.engine'
import {
  getPitchInNearestOctave,
  optimizeProgressionVoiceLeading,
  optimizeVoiceLeading,
  voiceLeadingDistance
} from '@/core/theory/voice-leading'

describe('Voice Leading Engine', () => {
  describe('optimizeVoiceLeading', () => {
    it('should optimize C Major to F Major choosing 2nd inversion for minimal semitone movement', () => {
      const cMajor = ['C4', 'E4', 'G4']
      const fMajor = ['F4', 'A4', 'C5']

      // In root position: C4->F4 (+5), E4->A4 (+5), G4->C5 (+5) = 15 semitones
      // 2nd inversion: C4->C4 (0), E4->F4 (+1), G4->A4 (+2) = 3 semitones
      const optimized = optimizeVoiceLeading(cMajor, fMajor)
      expect(optimized).toEqual(['C4', 'F4', 'A4'])
    })

    it('should optimize C Major to G Major choosing 1st inversion in the same register', () => {
      const cMajor = ['C4', 'E4', 'G4']
      const gMajor = ['G4', 'B4', 'D5']

      // 1st inversion shifted: C4->B3 (-1), E4->D4 (-2), G4->G4 (0) = 3 semitones
      const optimized = optimizeVoiceLeading(cMajor, gMajor)
      expect(optimized).toEqual(['B3', 'D4', 'G4'])
    })

    it('should return next chord notes unchanged if previous chord is empty', () => {
      const nextChord = ['F4', 'A4', 'C5']
      expect(optimizeVoiceLeading([], nextChord)).toEqual(nextChord)
    })

    it('should handle bare pitch classes without octaves', () => {
      const cMajor = ['C', 'E', 'G']
      const fMajor = ['F', 'A', 'C']
      const optimized = optimizeVoiceLeading(cMajor, fMajor)
      expect(optimized).toEqual(['C', 'F', 'A'])
    })
  })

  describe('getPitchInNearestOctave', () => {
    it('should place note in target octave if no previous pitch is given', () => {
      expect(getPitchInNearestOctave('C', 4)).toBe('C4')
      expect(getPitchInNearestOctave('F#', 5)).toBe('F#5')
    })

    it('should avoid octave leap down by choosing B3 after C4', () => {
      // C4 is MIDI 60. B3 is 59 (dist 1), B4 is 71 (dist 11). Target octave is 4.
      expect(getPitchInNearestOctave('B', 4, 'C4')).toBe('B3')
    })

    it('should avoid octave leap up by choosing C4 after B3', () => {
      // B3 is MIDI 59. C4 is 60 (dist 1), C3 is 48 (dist 11). Target octave is 3.
      expect(getPitchInNearestOctave('C', 3, 'B3')).toBe('C4')
    })

    it('should maintain current octave when step distance is small', () => {
      expect(getPitchInNearestOctave('D', 4, 'C4')).toBe('D4')
      expect(getPitchInNearestOctave('E', 4, 'C4')).toBe('E4')
    })

    it('should resolve equidistant leaps by preferring targetOctave', () => {
      // C4 (60) to F#3 (54) vs F#4 (66) both have distance 6. Target octave 4 chooses F#4.
      expect(getPitchInNearestOctave('F#', 4, 'C4')).toBe('F#4')
    })
  })

  describe('optimizeProgressionVoiceLeading', () => {
    function createChord(
      name: string,
      roman: string,
      startBar: number,
      notes: string[]
    ): import('@/core/schemas/chord.schema').ChordEvent {
      return {
        id: `chord-${name}-${startBar}`,
        name,
        roman,
        notes,
        voicing: notes.map((n) => `${n}3`),
        startBar,
        durationBars: 1,
        inversion: 0
      }
    }

    it('returns empty array when given empty progression', () => {
      expect(optimizeProgressionVoiceLeading([])).toEqual([])
    })

    it('returns single chord unchanged', () => {
      const single = [createChord('C', 'I', 0, ['C', 'E', 'G'])]
      const result = optimizeProgressionVoiceLeading(single, 3)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('C')
    })

    it('optimizes classic I-IV-V-I progression to smooth inversions with common tones', () => {
      const progression = [
        createChord('C', 'I', 0, ['C', 'E', 'G']),
        createChord('F', 'IV', 1, ['F', 'A', 'C']),
        createChord('G', 'V', 2, ['G', 'B', 'D']),
        createChord('C', 'I', 3, ['C', 'E', 'G'])
      ]

      const optimized = optimizeProgressionVoiceLeading(progression, 3)

      expect(optimized).toHaveLength(4)
      // Chord 0 (C) starts in root position
      expect(optimized[0].inversion).toBe(0)

      // Chord 1 (F) should choose 2nd inversion (C-F-A) to keep common tone C stationary
      expect(optimized[1].inversion).toBe(2)
      expect(optimized[1].notes[0]).toBe('C')

      // Chord 3 (C) returns smoothly to root position
      expect(optimized[3].inversion).toBe(0)
    })

    it('handles 7th chords with 4 inversions (ii7 - V7 - Imaj7)', () => {
      const progression = [
        createChord('Dm7', 'ii7', 0, ['D', 'F', 'A', 'C']),
        createChord('G7', 'V7', 1, ['G', 'B', 'D', 'F']),
        createChord('Cmaj7', 'Imaj7', 2, ['C', 'E', 'G', 'B'])
      ]

      const optimized = optimizeProgressionVoiceLeading(progression, 3)

      expect(optimized).toHaveLength(3)
      for (const chord of optimized) {
        expect(chord.inversion).toBeGreaterThanOrEqual(0)
        expect(chord.inversion).toBeLessThanOrEqual(3)
        expect(chord.voicing).toHaveLength(4)
      }
    })
  })

  describe('applyVoicingStyle & buildChordVoicing styles', () => {
    it('preserves close voicing without modification', () => {
      const close = ['C3', 'E3', 'G3']
      expect(applyVoicingStyle(close, 'close')).toEqual(['C3', 'E3', 'G3'])
    })

    it('applies Drop-2 by lowering the 2nd highest note by one octave', () => {
      // In C4 E4 G4: 2nd highest note is E4 -> becomes E3. Sorted: E3 C4 G4
      const triad = ['C4', 'E4', 'G4']
      const drop2Triad = applyVoicingStyle(triad, 'drop-2')
      expect(drop2Triad).toEqual(['E3', 'C4', 'G4'])

      // In C4 E4 G4 B4: 2nd highest note is G4 -> becomes G3. Sorted: G3 C4 E4 B4
      const seventh = ['C4', 'E4', 'G4', 'B4']
      const drop2Seventh = applyVoicingStyle(seventh, 'drop-2')
      expect(drop2Seventh).toEqual(['G3', 'C4', 'E4', 'B4'])
    })

    it('applies Bass + Triad by prepending a foundational bass note in register 1-2', () => {
      const chord = ['C3', 'E3', 'G3']
      const bassTriad = applyVoicingStyle(chord, 'bass-triad', 'C')
      expect(bassTriad).toHaveLength(4)
      expect(bassTriad[0]).toBe('C2')
      expect(bassTriad.slice(1)).toEqual(['C3', 'E3', 'G3'])
    })
  })

  describe('voiceLeadingDistance', () => {
    it('is zero for identical voicings', () => {
      expect(voiceLeadingDistance(['C4', 'E4', 'G4'], ['C4', 'E4', 'G4'])).toBe(0)
    })

    it('returns the mean semitone movement per voice', () => {
      // C4->F4 (+5), E4->A4 (+5), G4->C5 (+5) = 15 over 3 voices
      expect(voiceLeadingDistance(['C4', 'E4', 'G4'], ['F4', 'A4', 'C5'])).toBe(5)
    })

    it('pairs voices bottom-up regardless of the input order', () => {
      expect(voiceLeadingDistance(['G4', 'C4', 'E4'], ['C4', 'E4', 'G4'])).toBe(0)
    })

    it('measures an inverted voicing against its sorted neighbour', () => {
      // C4->E4 (+4), E4->G4 (+3), G4->C5 (+5) = 12 over 3 voices
      expect(voiceLeadingDistance(['C4', 'E4', 'G4'], ['E4', 'G4', 'C5'])).toBe(4)
    })

    it('compares only the voices both chords have in common', () => {
      expect(voiceLeadingDistance(['C4', 'E4', 'G4', 'B4'], ['C4', 'E4', 'G4'])).toBe(0)
    })

    it('rounds to one decimal place', () => {
      expect(voiceLeadingDistance(['C4', 'E4', 'G4'], ['C#4', 'E4', 'G4'])).toBe(0.3)
    })

    it('is zero when either voicing is empty', () => {
      expect(voiceLeadingDistance([], ['C4', 'E4', 'G4'])).toBe(0)
      expect(voiceLeadingDistance(['C4', 'E4', 'G4'], [])).toBe(0)
    })
  })
})
