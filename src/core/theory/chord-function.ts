import { Chord, Note } from 'tonal'
import type { ChordEvent } from '../schemas/chord.schema'
import type { DiatonicChord } from './chord.engine'

export type HarmonicFunction = 'tonic' | 'subdominant' | 'dominant'

/** A palette chord always maps to a function; timeline chords may be hand-edited beyond the key. */
export type ChordFunction = HarmonicFunction | 'custom'

export const FUNCTION_DEGREES: Record<HarmonicFunction, readonly number[]> = {
  tonic: [1, 6, 3],
  subdominant: [4, 2],
  dominant: [5, 7]
}

export function chordFunctionOfDegree(degree: number): HarmonicFunction {
  if (FUNCTION_DEGREES.tonic.includes(degree)) return 'tonic'
  if (FUNCTION_DEGREES.subdominant.includes(degree)) return 'subdominant'
  return 'dominant'
}

/**
 * Matches known spellings first, then uses the root for extended or altered chords.
 */
export function findDiatonicMatch(chord: ChordEvent, palette: readonly DiatonicChord[]): DiatonicChord | null {
  const exact = palette.find(
    (d) =>
      d.triadName === chord.name ||
      d.seventhName === chord.name ||
      d.roman === chord.roman ||
      d.romanSeventh === chord.roman
  )
  if (exact) return exact

  const root = Chord.get(chord.name).tonic
  const rootChroma = root ? Note.chroma(root) : undefined
  if (rootChroma === undefined) return null
  return palette.find((degree) => Note.chroma(degree.triadNotes[0]) === rootChroma) ?? null
}

export function getChordFunction(chord: ChordEvent, palette: readonly DiatonicChord[]): ChordFunction {
  const match = findDiatonicMatch(chord, palette)
  return match ? chordFunctionOfDegree(match.degree) : 'custom'
}

/** Groups palette chords for display, preserving the palette's ascending degree order. */
export function groupPaletteByFunction(palette: readonly DiatonicChord[]): Record<HarmonicFunction, DiatonicChord[]> {
  return {
    tonic: palette.filter((c) => chordFunctionOfDegree(c.degree) === 'tonic'),
    subdominant: palette.filter((c) => chordFunctionOfDegree(c.degree) === 'subdominant'),
    dominant: palette.filter((c) => chordFunctionOfDegree(c.degree) === 'dominant')
  }
}
