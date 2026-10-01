import { describe, expect, it } from 'vitest'
import { resolveMotifSections } from '../../../src/core/generator/motif-sections'

const STEPS_PER_BAR = 16

describe('resolveMotifSections', () => {
  it('returns an empty array for FREE', () => {
    expect(resolveMotifSections('FREE', 4, STEPS_PER_BAR, 0)).toEqual([])
  })

  it('returns exactly one source section for a single bar', () => {
    expect(resolveMotifSections('ABAB', 1, STEPS_PER_BAR, 0)).toEqual([
      { letter: 'A', bar: 0, startStep: 0, endStep: STEPS_PER_BAR, role: 'source', sourceBar: undefined }
    ])
  })

  it('tiles four bars of ABAB with roles relative to the first section', () => {
    const sections = resolveMotifSections('ABAB', 4, STEPS_PER_BAR, 0)

    expect(sections.map((section) => section.letter)).toEqual(['A', 'B', 'A', 'B'])
    expect(sections.map((section) => section.role)).toEqual(['source', 'contrast', 'repeat', 'contrast'])
    expect(sections.map((section) => [section.startStep, section.endStep])).toEqual([
      [0, 16],
      [16, 32],
      [32, 48],
      [48, 64]
    ])
    expect(sections.map((section) => section.sourceBar)).toEqual([undefined, 0, 0, 0])
  })

  it.each([5, 6, 7])('keeps every section boundary on a bar line for %s bars', (bars) => {
    const sections = resolveMotifSections('ABAB', bars, STEPS_PER_BAR, 0)

    expect(sections).toHaveLength(bars)
    sections.forEach((section, index) => {
      expect(section.bar).toBe(index)
      expect(section.startStep).toBe(index * STEPS_PER_BAR)
      expect(section.endStep).toBe((index + 1) * STEPS_PER_BAR)
      expect(section.startStep % STEPS_PER_BAR).toBe(0)
      expect(section.endStep % STEPS_PER_BAR).toBe(0)
    })
  })

  it('tiles the pattern twice across eight bars instead of stretching it', () => {
    const sections = resolveMotifSections('ABAB', 8, STEPS_PER_BAR, 0)

    expect(sections.map((section) => section.letter)).toEqual(['A', 'B', 'A', 'B', 'A', 'B', 'A', 'B'])
    // A stretched pattern would create two-bar sections; tiling keeps one bar per section.
    sections.forEach((section) => {
      expect(section.endStep - section.startStep).toBe(STEPS_PER_BAR)
    })
  })

  it('shifts bars and absolute steps by the startStep offset', () => {
    const sections = resolveMotifSections('AABA', 2, STEPS_PER_BAR, 32)

    expect(sections.map((section) => section.bar)).toEqual([2, 3])
    expect(sections.map((section) => section.letter)).toEqual(['A', 'A'])
    expect(sections[0]).toMatchObject({ startStep: 32, endStep: 48, role: 'source', sourceBar: undefined })
    expect(sections[1]).toMatchObject({ startStep: 48, endStep: 64, role: 'repeat', sourceBar: 2 })
  })

  it('resolves letters generically beyond ABAB', () => {
    const sections = resolveMotifSections('ABAC', 4, STEPS_PER_BAR, 0)

    expect(sections.map((section) => section.letter)).toEqual(['A', 'B', 'A', 'C'])
    expect(sections.map((section) => section.role)).toEqual(['source', 'contrast', 'repeat', 'contrast'])
    expect(sections.map((section) => section.sourceBar)).toEqual([undefined, 0, 0, 0])
  })

  it('resolves AABC with the hook confirmed before two contrasting bars', () => {
    const sections = resolveMotifSections('AABC', 4, STEPS_PER_BAR, 0)

    expect(sections.map((section) => section.letter)).toEqual(['A', 'A', 'B', 'C'])
    expect(sections.map((section) => section.role)).toEqual(['source', 'repeat', 'contrast', 'contrast'])
    expect(sections.map((section) => section.sourceBar)).toEqual([undefined, 0, 0, 0])
  })

  it('keeps ABCB roles relative to the opening A section', () => {
    const sections = resolveMotifSections('ABCB', 4, STEPS_PER_BAR, 0)

    expect(sections.map((section) => section.letter)).toEqual(['A', 'B', 'C', 'B'])
    // Roles stay hook-relative (task 43 semantics): the returning B on the loop seam is
    // not the opening letter, so it reads as contrast even though applyMotifStructure
    // derives its material from bar 2.
    expect(sections.map((section) => section.role)).toEqual(['source', 'contrast', 'contrast', 'contrast'])
    expect(sections[3]?.sourceBar).toBe(0)
  })

  it.each(['AABC', 'ABCB'] as const)('tiles %s twice across eight bars on bar lines', (pattern) => {
    const sections = resolveMotifSections(pattern, 8, STEPS_PER_BAR, 0)

    expect(sections).toHaveLength(8)
    expect(sections.map((section) => section.letter)).toEqual([...pattern, ...pattern])
    sections.forEach((section, index) => {
      expect(section.bar).toBe(index)
      expect(section.startStep).toBe(index * STEPS_PER_BAR)
      expect(section.endStep).toBe((index + 1) * STEPS_PER_BAR)
      expect(section.startStep % STEPS_PER_BAR).toBe(0)
      expect(section.endStep % STEPS_PER_BAR).toBe(0)
      expect(section.endStep - section.startStep).toBe(STEPS_PER_BAR)
    })
  })
})
