import { describe, expect, it } from 'vitest'
import { getKeyboardKeyTooltip } from '@/core/theory/keyboard-tooltip'

describe('getKeyboardKeyTooltip', () => {
  describe('Natural Notes (White Keys)', () => {
    it('returns natural note name with octave in C Major', () => {
      expect(getKeyboardKeyTooltip(60, 'C', 'major')).toBe('C4 (Root)')
      expect(getKeyboardKeyTooltip(62, 'C', 'major')).toBe('D4')
      expect(getKeyboardKeyTooltip(64, 'C', 'major')).toBe('E4')
      expect(getKeyboardKeyTooltip(65, 'C', 'major')).toBe('F4')
      expect(getKeyboardKeyTooltip(67, 'C', 'major')).toBe('G4')
      expect(getKeyboardKeyTooltip(69, 'C', 'major')).toBe('A4')
      expect(getKeyboardKeyTooltip(71, 'C', 'major')).toBe('B4')
      expect(getKeyboardKeyTooltip(72, 'C', 'major')).toBe('C5 (Root)')
    })

    it('identifies non-C root note correctly on natural keys', () => {
      expect(getKeyboardKeyTooltip(65, 'F', 'minor')).toBe('F4 (Root)')
      expect(getKeyboardKeyTooltip(60, 'F', 'minor')).toBe('C4')
      expect(getKeyboardKeyTooltip(62, 'D', 'major')).toBe('D4 (Root)')
      expect(getKeyboardKeyTooltip(67, 'G', 'major')).toBe('G4 (Root)')
    })

    it('works when no root or scale is specified', () => {
      expect(getKeyboardKeyTooltip(60)).toBe('C4')
      expect(getKeyboardKeyTooltip(62)).toBe('D4')
      expect(getKeyboardKeyTooltip(64)).toBe('E4')
    })
  })

  describe('Accidental Notes (Black Keys)', () => {
    it('displays sharp-first pairs when key is neutral / C major', () => {
      expect(getKeyboardKeyTooltip(61, 'C', 'major')).toBe('C#4 / Db4')
      expect(getKeyboardKeyTooltip(63, 'C', 'major')).toBe('D#4 / Eb4')
      expect(getKeyboardKeyTooltip(66, 'C', 'major')).toBe('F#4 / Gb4')
      expect(getKeyboardKeyTooltip(68, 'C', 'major')).toBe('G#4 / Ab4')
      expect(getKeyboardKeyTooltip(70, 'C', 'major')).toBe('A#4 / Bb4')
    })

    it('prioritizes flat spellings when the active scale contains flats', () => {
      // In F Minor: Db, Eb, Ab, Bb are diatonic
      expect(getKeyboardKeyTooltip(61, 'F', 'minor')).toBe('Db4 / C#4')
      expect(getKeyboardKeyTooltip(63, 'F', 'minor')).toBe('Eb4 / D#4')
      expect(getKeyboardKeyTooltip(68, 'F', 'minor')).toBe('Ab4 / G#4')
      expect(getKeyboardKeyTooltip(70, 'F', 'minor')).toBe('Bb4 / A#4')

      // F# / Gb is non-diatonic in F minor, keeps default sharp-first pair
      expect(getKeyboardKeyTooltip(66, 'F', 'minor')).toBe('F#4 / Gb4')
    })

    it('prioritizes sharp spellings when the active scale contains sharps', () => {
      // In D Major: F# and C# are diatonic
      expect(getKeyboardKeyTooltip(61, 'D', 'major')).toBe('C#4 / Db4')
      expect(getKeyboardKeyTooltip(66, 'D', 'major')).toBe('F#4 / Gb4')
    })

    it('annotates accidental root notes with (Root)', () => {
      // Flat root
      expect(getKeyboardKeyTooltip(70, 'Bb', 'minor')).toBe('Bb4 / A#4 (Root)')
      expect(getKeyboardKeyTooltip(63, 'Eb', 'major')).toBe('Eb4 / D#4 (Root)')

      // Sharp root
      expect(getKeyboardKeyTooltip(66, 'F#', 'major')).toBe('F#4 / Gb4 (Root)')
      expect(getKeyboardKeyTooltip(61, 'C#', 'minor')).toBe('C#4 / Db4 (Root)')
    })
  })

  describe('Rare Enharmonic Spellings', () => {
    it('shows both theoretical scale spelling and base physical key for E# in F# Major', () => {
      // MIDI 65 is physically F4, but in F# major the 7th degree is E#
      expect(getKeyboardKeyTooltip(65, 'F#', 'major')).toBe('E#4 / F4')
    })
  })

  describe('Boundaries and Invalid Inputs', () => {
    it('handles lowest MIDI note (C-1 = 0)', () => {
      expect(getKeyboardKeyTooltip(0)).toBe('C-1')
    })

    it('handles octave 0 (C0 = 12)', () => {
      expect(getKeyboardKeyTooltip(12)).toBe('C0')
    })

    it('handles highest standard MIDI note (G9 = 127)', () => {
      expect(getKeyboardKeyTooltip(127)).toBe('G9')
    })

    it('returns empty string for negative or out-of-range MIDI numbers', () => {
      expect(getKeyboardKeyTooltip(-1)).toBe('')
      expect(getKeyboardKeyTooltip(128)).toBe('')
      expect(getKeyboardKeyTooltip(Number.NaN)).toBe('')
    })
  })
})
