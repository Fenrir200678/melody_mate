import type { MotifPattern } from '../schemas/generator.schema'

export type MotifSectionRole = 'source' | 'repeat' | 'contrast'

export interface MotifSection {
  letter: string
  /** Absolute bar index the section occupies. */
  bar: number
  startStep: number
  /** Exclusive upper step bound; always the next bar line. */
  endStep: number
  role: MotifSectionRole
  /** Bar of the first section every derivation refers to; undefined for the source itself. */
  sourceBar: number | undefined
}

/**
 * Resolves a motif pattern into bar-aligned sections by tiling one bar per letter
 * (letter = pattern[(bar - firstBar) % pattern.length]) instead of stretching the
 * pattern across the region, so section boundaries always sit on bar lines for any
 * bar count. FREE produces no derivations and resolves to an empty array.
 *
 * Roles are relative to the first section: a later section repeating its letter is a
 * 'repeat', any other letter is 'contrast'. Parallel (not cumulative) derivation:
 * sourceBar always points at the first section, never at the previous one.
 */
export function resolveMotifSections(
  pattern: MotifPattern,
  bars: number,
  stepsPerBar: number,
  startStep: number
): MotifSection[] {
  if (pattern === 'FREE' || stepsPerBar < 1) {
    return []
  }

  const letters = pattern.split('')
  const firstBar = Math.floor(startStep / stepsPerBar)
  const sectionCount = Math.max(1, Math.floor(bars))
  const sections: MotifSection[] = []

  for (let index = 0; index < sectionCount; index++) {
    const bar = firstBar + index
    const letter = letters[index % letters.length]
    const isSource = index === 0

    sections.push({
      letter,
      bar,
      startStep: bar * stepsPerBar,
      endStep: (bar + 1) * stepsPerBar,
      role: isSource ? 'source' : letter === letters[0] ? 'repeat' : 'contrast',
      sourceBar: isSource ? undefined : firstBar
    })
  }

  return sections
}
