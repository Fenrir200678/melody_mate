import { chordFunctionOfDegree, type ChordFunction, type HarmonicFunction } from '@/core/theory/chord-function'
import type { DiatonicChord } from '@/core/theory/chord.engine'

export const FUNCTION_LABELS: Record<ChordFunction, string> = {
  tonic: 'Tonic',
  subdominant: 'Subdominant',
  dominant: 'Dominant',
  custom: 'Custom'
}

export const SECTION_LABELS: Record<HarmonicFunction, string> = {
  tonic: 'Tonic (Home)',
  subdominant: 'Subdominant (Motion)',
  dominant: 'Dominant (Tension)'
}

export interface FunctionTheme {
  /** Solid indicator dot in the inspector role pill. */
  dot: string
  /** Roman numerals and role names. */
  text: string
  /** Timeline chord block surface. */
  block: string
}

/** Shared by timeline blocks and the inspector; both read the same functional colour language. */
export const FUNCTION_THEME: Record<ChordFunction, FunctionTheme> = {
  tonic: {
    dot: 'bg-sky-400',
    text: 'text-sky-400',
    block: 'border-sky-500/35 bg-sky-500/10 hover:border-sky-400 hover:bg-sky-500/20'
  },
  subdominant: {
    dot: 'bg-purple-400',
    text: 'text-purple-400',
    block: 'border-purple-500/35 bg-purple-500/10 hover:border-purple-400 hover:bg-purple-500/20'
  },
  dominant: {
    dot: 'bg-amber-400',
    text: 'text-amber-400',
    block: 'border-amber-500/35 bg-amber-500/10 hover:border-amber-400 hover:bg-amber-500/20'
  },
  custom: {
    dot: 'bg-daw-chord',
    text: 'text-daw-chord',
    block: 'border-daw-chord/40 bg-daw-chord/10 hover:border-daw-chord/80 hover:bg-daw-chord/15'
  }
}

export type PaletteTone = HarmonicFunction | 'leading'

export interface PaletteCardTheme {
  dot: string
  card: string
  roman: string
  badge: string
  /** Hover affordance on the insert glyph, only rendered in 'preview' click mode. */
  insert: string
  /** Literal grid class, since Tailwind cannot see interpolated `grid-cols-n` names. */
  grid: string
}

/**
 * Palette cards use the daw-chord token for subdominant where timeline blocks use purple-400.
 * Kept as-is so the extraction stays pixel-identical; unifying them is a separate design call.
 */
export const PALETTE_CARD_THEME: Record<PaletteTone, PaletteCardTheme> = {
  tonic: {
    dot: 'bg-sky-400',
    card: 'border-sky-500/30 bg-sky-500/5 hover:border-sky-400 hover:bg-sky-500/15',
    roman: 'text-sky-400',
    badge: 'bg-sky-500/20 text-sky-300',
    insert: 'text-sky-300 hover:bg-sky-500/30',
    grid: 'grid-cols-3'
  },
  subdominant: {
    dot: 'bg-daw-chord',
    card: 'border-daw-chord/30 bg-daw-chord/5 hover:border-daw-chord hover:bg-daw-chord/15',
    roman: 'text-daw-chord',
    badge: 'bg-daw-chord/20 text-daw-chord',
    insert: 'text-daw-chord hover:bg-daw-chord/30',
    grid: 'grid-cols-2'
  },
  dominant: {
    dot: 'bg-amber-400',
    card: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-400 hover:bg-amber-500/15',
    roman: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300',
    insert: 'text-amber-300 hover:bg-amber-500/30',
    grid: 'grid-cols-2'
  },
  leading: {
    dot: 'bg-amber-400',
    card: 'border-red-500/30 bg-red-500/5 hover:border-red-400 hover:bg-red-500/15',
    roman: 'text-red-400',
    badge: 'bg-red-500/20 text-red-300',
    insert: 'text-red-300 hover:bg-red-500/30',
    grid: 'grid-cols-2'
  }
}

/** Degree 7 is the leading tone and gets an alarm-red treatment inside the dominant group. */
export function paletteToneOf(chord: DiatonicChord): PaletteTone {
  return chord.degree === 7 ? 'leading' : chordFunctionOfDegree(chord.degree)
}
