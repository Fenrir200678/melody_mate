import { describe, expect, it } from 'vitest'
import type { ChordEvent } from '@/core/schemas/chord.schema'
import { getDiatonicChords, type DiatonicChord } from '@/core/theory/chord.engine'
import {
  chordFunctionOfDegree,
  findDiatonicMatch,
  getChordFunction,
  groupPaletteByFunction
} from '@/core/theory/chord-function'

const palette = getDiatonicChords('C', 'major')

function atDegree(degree: number): DiatonicChord {
  const found = palette.find((c) => c.degree === degree)
  if (!found) throw new Error(`no palette entry for degree ${degree}`)
  return found
}

function chordFrom(entry: DiatonicChord, variant: 'triad' | 'seventh' = 'triad'): ChordEvent {
  const isTriad = variant === 'triad'
  return {
    id: `${entry.degree}-${variant}`,
    name: isTriad ? entry.triadName : entry.seventhName,
    roman: isTriad ? entry.roman : entry.romanSeventh,
    notes: [...(isTriad ? entry.triadNotes : entry.seventhNotes)],
    voicing: isTriad ? ['C4', 'E4', 'G4'] : ['C4', 'E4', 'G4', 'B4'],
    startBar: 0,
    durationBars: 1
  }
}

describe('Chord Function', () => {
  describe('chordFunctionOfDegree', () => {
    it('maps degrees 1, 3 and 6 to tonic', () => {
      expect(chordFunctionOfDegree(1)).toBe('tonic')
      expect(chordFunctionOfDegree(3)).toBe('tonic')
      expect(chordFunctionOfDegree(6)).toBe('tonic')
    })

    it('maps degrees 2 and 4 to subdominant', () => {
      expect(chordFunctionOfDegree(2)).toBe('subdominant')
      expect(chordFunctionOfDegree(4)).toBe('subdominant')
    })

    it('maps degrees 5 and 7 to dominant', () => {
      expect(chordFunctionOfDegree(5)).toBe('dominant')
      expect(chordFunctionOfDegree(7)).toBe('dominant')
    })
  })

  describe('getChordFunction', () => {
    it('resolves every diatonic triad to its degree function', () => {
      for (const entry of palette) {
        expect(getChordFunction(chordFrom(entry), palette)).toBe(chordFunctionOfDegree(entry.degree))
      }
    })

    it('resolves seventh spellings to the same function as their triads', () => {
      for (const entry of palette) {
        expect(getChordFunction(chordFrom(entry, 'seventh'), palette)).toBe(chordFunctionOfDegree(entry.degree))
      }
    })

    it('falls back to the roman numeral when the chord name is unknown', () => {
      const dominant = atDegree(5)
      const renamed: ChordEvent = { ...chordFrom(dominant), name: 'UnknownSymbol' }
      expect(getChordFunction(renamed, palette)).toBe('dominant')
    })

    it('classifies extended and altered chords by their diatonic root', () => {
      const tonic: ChordEvent = { ...chordFrom(atDegree(1)), name: 'Cmaj9', roman: 'Imaj9' }
      const dominant: ChordEvent = { ...chordFrom(atDegree(5)), name: 'G7', roman: 'V7' }
      const alteredDominant: ChordEvent = { ...dominant, name: 'E7', roman: 'V7' }
      expect(getChordFunction(tonic, palette)).toBe('tonic')
      expect(getChordFunction(dominant, palette)).toBe('dominant')
      expect(getChordFunction(alteredDominant, getDiatonicChords('A', 'minor'))).toBe('dominant')
    })

    it('reports custom for chords outside the key', () => {
      const foreign: ChordEvent = { ...chordFrom(atDegree(1)), name: 'Db', roman: 'bII' }
      expect(getChordFunction(foreign, palette)).toBe('custom')
    })
  })

  describe('findDiatonicMatch', () => {
    it('matches by triad name', () => {
      const tonic = atDegree(1)
      expect(findDiatonicMatch(chordFrom(tonic), palette)?.degree).toBe(1)
    })

    it('matches by seventh name', () => {
      const subdominant = atDegree(4)
      expect(findDiatonicMatch(chordFrom(subdominant, 'seventh'), palette)?.degree).toBe(4)
    })

    it('returns null when nothing matches', () => {
      expect(findDiatonicMatch({ ...chordFrom(atDegree(1)), name: 'Db', roman: 'bII' }, palette)).toBeNull()
    })
  })

  describe('groupPaletteByFunction', () => {
    it('splits the seven degrees into 3 tonic, 2 subdominant and 2 dominant chords', () => {
      const grouped = groupPaletteByFunction(palette)
      expect(grouped.tonic).toHaveLength(3)
      expect(grouped.subdominant).toHaveLength(2)
      expect(grouped.dominant).toHaveLength(2)
    })

    it('keeps the ascending degree order of the palette inside every group', () => {
      const grouped = groupPaletteByFunction(palette)
      expect(grouped.tonic.map((c) => c.degree)).toEqual([1, 3, 6])
      expect(grouped.subdominant.map((c) => c.degree)).toEqual([2, 4])
      expect(grouped.dominant.map((c) => c.degree)).toEqual([5, 7])
    })
  })
})
