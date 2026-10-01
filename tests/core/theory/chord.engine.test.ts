import { describe, expect, it } from 'vitest'
import type { ChordEvent } from '@/core/schemas/chord.schema'
import {
  buildChordVoicing,
  deriveChordIdentity,
  getChordInversion,
  getChordNotes,
  getDiatonicChords,
  resolveChordOverlaps
} from '@/core/theory/chord.engine'

describe('Chord Engine', () => {
  describe('getDiatonicChords', () => {
    it('should generate accurate diatonic triads and 7ths for C Major', () => {
      const chords = getDiatonicChords('C', 'major')
      expect(chords).toHaveLength(7)

      // I: C, Cmaj7
      expect(chords[0].degree).toBe(1)
      expect(chords[0].triadName).toBe('C')
      expect(chords[0].roman).toBe('I')
      expect(chords[0].triadNotes).toEqual(['C', 'E', 'G'])
      expect(chords[0].seventhName).toBe('Cmaj7')
      expect(chords[0].romanSeventh).toBe('Imaj7')
      expect(chords[0].seventhNotes).toEqual(['C', 'E', 'G', 'B'])

      // ii: Dm, Dm7
      expect(chords[1].degree).toBe(2)
      expect(chords[1].triadName).toBe('Dm')
      expect(chords[1].roman).toBe('ii')
      expect(chords[1].seventhName).toBe('Dm7')
      expect(chords[1].romanSeventh).toBe('ii7')

      // iii: Em, Em7
      expect(chords[2].triadName).toBe('Em')
      expect(chords[2].roman).toBe('iii')

      // IV: F, Fmaj7
      expect(chords[3].triadName).toBe('F')
      expect(chords[3].roman).toBe('IV')
      expect(chords[3].romanSeventh).toBe('IVmaj7')

      // V: G, G7
      expect(chords[4].triadName).toBe('G')
      expect(chords[4].roman).toBe('V')
      expect(chords[4].seventhName).toBe('G7')
      expect(chords[4].romanSeventh).toBe('V7')

      // vi: Am, Am7
      expect(chords[5].triadName).toBe('Am')
      expect(chords[5].roman).toBe('vi')

      // vii°: Bdim, Bm7b5 (viiø7)
      expect(chords[6].triadName).toBe('Bdim')
      expect(chords[6].roman).toBe('vii°')
      expect(chords[6].seventhName).toBe('Bm7b5')
      expect(chords[6].romanSeventh).toBe('viiø7')
    })

    it('should generate accurate diatonic chords for A Minor', () => {
      const chords = getDiatonicChords('A', 'minor')
      expect(chords).toHaveLength(7)

      // i: Am
      expect(chords[0].triadName).toBe('Am')
      expect(chords[0].roman).toBe('i')

      // ii°: Bdim
      expect(chords[1].triadName).toBe('Bdim')
      expect(chords[1].roman).toBe('ii°')

      // III: C
      expect(chords[2].triadName).toBe('C')
      expect(chords[2].roman).toBe('III')

      // VII: G
      expect(chords[6].triadName).toBe('G')
      expect(chords[6].roman).toBe('VII')
    })
  })

  describe('getChordNotes', () => {
    it('should resolve pitch classes without octave', () => {
      expect(getChordNotes('C')).toEqual(['C', 'E', 'G'])
      expect(getChordNotes('Am')).toEqual(['A', 'C', 'E'])
      expect(getChordNotes('G7')).toEqual(['G', 'B', 'D', 'F'])
    })

    it('should resolve voiced pitches ascending when octave is provided', () => {
      expect(getChordNotes('C', 4)).toEqual(['C4', 'E4', 'G4'])
      expect(getChordNotes('Am', 4)).toEqual(['A4', 'C5', 'E5'])
      expect(getChordNotes('G7', 3)).toEqual(['G3', 'B3', 'D4', 'F4'])
    })

    it('should return empty array for empty or invalid chord names', () => {
      expect(getChordNotes('')).toEqual([])
      expect(getChordNotes('NonExistentChord')).toEqual([])
    })
  })

  describe('getChordInversion', () => {
    const rootChord = ['C4', 'E4', 'G4']

    it('should return identical notes for root position (inversion 0)', () => {
      expect(getChordInversion(rootChord, 0)).toEqual(['C4', 'E4', 'G4'])
    })

    it('should raise lowest note by one octave for first inversion (inversion 1)', () => {
      expect(getChordInversion(rootChord, 1)).toEqual(['E4', 'G4', 'C5'])
    })

    it('should raise two lowest notes for second inversion (inversion 2)', () => {
      expect(getChordInversion(rootChord, 2)).toEqual(['G4', 'C5', 'E5'])
    })

    it('should handle third inversion for seventh chords', () => {
      const c7 = ['C4', 'E4', 'G4', 'B4']
      expect(getChordInversion(c7, 3)).toEqual(['B4', 'C5', 'E5', 'G5'])
    })

    it('should rotate bare pitch classes without octaves', () => {
      expect(getChordInversion(['C', 'E', 'G'], 1)).toEqual(['E', 'G', 'C'])
      expect(getChordInversion(['C', 'E', 'G'], 2)).toEqual(['G', 'C', 'E'])
    })
  })

  describe('buildChordVoicing', () => {
    it('should build close-position triad voicings from a base octave', () => {
      expect(buildChordVoicing('C', 3, 0)).toEqual(['C3', 'E3', 'G3'])
      expect(buildChordVoicing('Am', 4, 0)).toEqual(['A4', 'C5', 'E5'])
      expect(buildChordVoicing('G7', 3, 0)).toEqual(['G3', 'B3', 'D4', 'F4'])
    })

    it('should produce real pitch shifts for inversions (ascending sorted)', () => {
      expect(buildChordVoicing('C', 3, 1)).toEqual(['E3', 'G3', 'C4'])
      expect(buildChordVoicing('C', 3, 2)).toEqual(['G3', 'C4', 'E4'])
      expect(buildChordVoicing('G7', 3, 3)).toEqual(['F4', 'G4', 'B4', 'D5'])
    })

    it('should follow the requested register', () => {
      expect(buildChordVoicing('C', 5, 0)).toEqual(['C5', 'E5', 'G5'])
      expect(buildChordVoicing('C', 1, 1)).toEqual(['E1', 'G1', 'C2'])
    })

    it('should return an empty array for invalid chord names', () => {
      expect(buildChordVoicing('', 3, 0)).toEqual([])
      expect(buildChordVoicing('NonExistentChord', 3, 0)).toEqual([])
    })
  })

  describe('deriveChordIdentity', () => {
    const palette = getDiatonicChords('C', 'major')

    it('should match diatonic chords in the active key (name + roman)', () => {
      expect(deriveChordIdentity(['C3', 'E3', 'G3'], palette, 'C', 'major')).toEqual({
        name: 'C',
        roman: 'I',
        notes: ['C', 'E', 'G']
      })
      expect(deriveChordIdentity(['A3', 'C4', 'E4'], palette, 'C', 'major')).toEqual({
        name: 'Am',
        roman: 'vi',
        notes: ['A', 'C', 'E']
      })
      expect(deriveChordIdentity(['C3', 'E3', 'G3', 'B3'], palette, 'C', 'major').name).toBe('Cmaj7')
    })

    it('should read inverted voicings as their root-position diatonic chord', () => {
      const identity = deriveChordIdentity(['E3', 'G3', 'C4'], palette, 'C', 'major')
      expect(identity.name).toBe('C')
      expect(identity.roman).toBe('I')
    })

    it('should detect non-diatonic chords and derive a Roman numeral from the key', () => {
      const identity = deriveChordIdentity(['D3', 'F3', 'A3'], palette, 'C', 'major')
      expect(identity.name).toBe('Dm')
      expect(identity.roman).toBe('ii')

      // A foreign cluster outside C major keeps a stable, non-empty identity
      const foreign = deriveChordIdentity(['D#3', 'G3', 'A#3'], palette, 'C', 'major')
      expect(foreign.notes).toHaveLength(3)
      expect(foreign.name.length).toBeGreaterThan(0)
    })

    it('should handle single-note voicings as bare pitch-class identities', () => {
      const identity = deriveChordIdentity(['G3'], palette, 'C', 'major')
      expect(identity).toEqual({ name: 'G', roman: 'V', notes: ['G'] })
    })

    it('should fall back gracefully for empty voicings', () => {
      const identity = deriveChordIdentity([], palette, 'C', 'major')
      expect(identity.name).toBe('Custom')
      expect(identity.notes).toEqual([])
    })
  })

  describe('resolveChordOverlaps', () => {
    function chord(id: string, startBar: number, durationBars: number): ChordEvent {
      return {
        id,
        name: 'C',
        roman: 'I',
        notes: ['C', 'E', 'G'],
        voicing: ['C3', 'E3', 'G3'],
        startBar,
        durationBars,
        inversion: 0
      }
    }

    it('should trim a predecessor to the start of its successor', () => {
      const resolved = resolveChordOverlaps([chord('a', 0, 4), chord('b', 2, 1)])
      expect(resolved).toHaveLength(2)
      expect(resolved.find((c) => c.id === 'a')?.durationBars).toBe(2)
      expect(ids(resolved)).toEqual(['a', 'b'])
    })

    it('should drop a chord fully covered by its successor', () => {
      const resolved = resolveChordOverlaps([chord('a', 2, 1), chord('b', 2, 2)])
      expect(resolved).toHaveLength(1)
      expect(resolved[0].id).toBe('b')
    })

    it('should leave non-overlapping timelines untouched and sorted', () => {
      const resolved = resolveChordOverlaps([chord('b', 2, 1), chord('a', 0, 1)])
      expect(resolved).toHaveLength(2)
      expect(ids(resolved)).toEqual(['a', 'b'])
      expect(resolved[0].durationBars).toBe(1)
    })

    function ids(chords: ChordEvent[]): string[] {
      return chords.map((c) => c.id)
    }
  })
})
