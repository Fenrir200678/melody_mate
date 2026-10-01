import { describe, expect, it } from 'vitest'
import { applyPitchOnlyStructure } from '../../../src/core/generator/pitch-structure'
import { GeneratorParamsSchema } from '../../../src/core/schemas/generator.schema'
import type { AppNote } from '../../../src/core/schemas/note.schema'

function note(id: string, pitch: string, midi: number, step: number): AppNote {
  return { id, pitch, midi, step, durationSteps: 4, velocity: 90, isMuted: false }
}

// Four bars with clearly distinct contours, two notes per bar
const fourBars: AppNote[] = [
  note('a1', 'C4', 60, 0),
  note('a2', 'E4', 64, 8),
  note('b1', 'D4', 62, 16),
  note('b2', 'F4', 65, 24),
  note('c1', 'G4', 67, 32),
  note('c2', 'B4', 71, 40),
  note('d1', 'A4', 69, 48),
  note('d2', 'D5', 74, 56)
]

function customParams(motif: string) {
  return GeneratorParamsSchema.parse({ rhythmMode: 'custom', motif, motifVariation: 0, callAndResponse: false })
}

function pitchesInBar(notes: AppNote[], bar: number): string[] {
  return notes.filter((n) => n.step >= bar * 16 && n.step < (bar + 1) * 16).map((n) => n.pitch)
}

describe('applyPitchOnlyStructure', () => {
  it('derives contrast pitches and repeats from the opening contour (ABAC)', () => {
    const result = applyPitchOnlyStructure(fourBars, customParams('ABAC'), 4, 16, 0, undefined, 'C', 'major', () => 0.1)

    expect(pitchesInBar(result, 0)).toEqual(['C4', 'E4'])
    expect(pitchesInBar(result, 1)).toEqual(['D4', 'F4'])
    // Task 45 derives B/C from A with a contrast floor; zero-intensity A repeats stay literal.
    expect(pitchesInBar(result, 2)).toEqual(['C4', 'E4'])
    expect(pitchesInBar(result, 3)).toEqual(['D4', 'F4'])
  })

  it('derives the ABCB loop seam in parallel from the opening bar', () => {
    const result = applyPitchOnlyStructure(fourBars, customParams('ABCB'), 4, 16, 0, undefined, 'C', 'major', () => 0.1)

    expect(pitchesInBar(result, 1)).toEqual(['D4', 'F4'])
    // Task 45 uses the opening hook for every contrast, avoiding cumulative drift.
    expect(pitchesInBar(result, 2)).toEqual(['D4', 'F4'])
    expect(pitchesInBar(result, 3)).toEqual(['D4', 'F4'])
  })

  it('does not flatten every bar onto the opening contour', () => {
    // The contrast floor keeps forms distinguishable despite their shared source phrase.
    for (const motif of ['ABAB', 'ABAC', 'AABA', 'AAAB', 'AABC', 'ABCB']) {
      const result = applyPitchOnlyStructure(
        fourBars,
        customParams(motif),
        4,
        16,
        0,
        undefined,
        'C',
        'major',
        () => 0.1
      )
      const barPitches = [0, 1, 2, 3].map((bar) => pitchesInBar(result, bar).join(','))

      expect(new Set(barPitches).size, motif).toBeGreaterThan(1)
    }
  })

  it('preserves rhythm, velocity and ids of the derived bar', () => {
    const result = applyPitchOnlyStructure(fourBars, customParams('ABAC'), 4, 16, 0, undefined, 'C', 'major', () => 0.1)
    const bar3 = result.filter((n) => n.step >= 32 && n.step < 48)

    expect(bar3.map((n) => [n.id, n.step, n.durationSteps, n.velocity])).toEqual([
      ['c1', 32, 4, 90],
      ['c2', 40, 4, 90]
    ])
  })

  it.each([0, 1])('preserves custom gates crossing section boundaries at intensity %s', (motifVariation) => {
    const crossing = [
      { ...fourBars[0], step: 12, durationSteps: 6 },
      { ...fourBars[2], step: 28, durationSteps: 6 },
      { ...fourBars[4], step: 44, durationSteps: 6 },
      { ...fourBars[6], step: 60, durationSteps: 4 }
    ]
    const result = applyPitchOnlyStructure(
      crossing,
      { ...customParams('ABAC'), motifVariation },
      4,
      16,
      0,
      undefined,
      'C',
      'major',
      () => 0.1
    )
    expect(result.map(({ id, step, durationSteps, velocity }) => ({ id, step, durationSteps, velocity }))).toEqual(
      crossing.map(({ id, step, durationSteps, velocity }) => ({ id, step, durationSteps, velocity }))
    )
  })

  it('returns every bar unchanged for FREE', () => {
    const result = applyPitchOnlyStructure(fourBars, customParams('FREE'), 4, 16, 0, undefined, 'C', 'major', () => 0.1)

    expect(result.map((n) => n.pitch)).toEqual(fourBars.map((n) => n.pitch))
  })
})
