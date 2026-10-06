import { describe, expect, it } from 'vitest'
import { generateMelody } from '../../../src/core/generator/melody.generator'
import { GeneratorParamsSchema } from '../../../src/core/schemas/generator.schema'
import { PROJECT_SCHEMA_VERSION, ProjectSchema } from '../../../src/core/schemas/project.schema'
import type { CustomRhythmPattern } from '../../../src/core/schemas/custom-rhythm.schema'

const pattern: CustomRhythmPattern = {
  bars: 2,
  events: [
    { step: 0, lengthSteps: 3, velocity: 72 },
    { step: 7, lengthSteps: 5, velocity: 112 },
    { step: 16, lengthSteps: 4, velocity: 92 },
    { step: 29, lengthSteps: 3, velocity: 72 }
  ]
}
const expected = [
  [0, 3],
  [7, 5],
  [16, 4],
  [29, 3],
  [32, 3],
  [39, 5],
  [48, 4],
  [61, 3]
]

describe('custom rhythm generation', () => {
  const project = ProjectSchema.parse({ version: PROJECT_SCHEMA_VERSION, bars: 4, key: 'C', scale: 'major' })
  const generator = GeneratorParamsSchema.parse({
    rhythmMode: 'custom',
    motif: 'ABAB',
    callAndResponse: false,
    restProbability: 1,
    noteLength: 0.25,
    noteLengthVariation: 1,
    velocityVariation: 0
  })

  it('keeps onsets and lengths on the canonical project grid', () => {
    const notes = generateMelody({
      project,
      generator,
      customPattern: pattern,
      rng: () => 0.5
    })
    expect(notes.map((note) => [note.step, note.durationSteps])).toEqual(expected)
  })

  it.each(['echo', 'continue', 'contrast'] as const)('keeps rhythm with %s call and response', (answerStyle) => {
    const notes = generateMelody({
      project,
      generator: { ...generator, callAndResponse: true, answerStyle },
      customPattern: pattern,
      rng: () => 0.5
    })
    expect(notes.map((note) => [note.step, note.durationSteps])).toEqual(expected)
  })

  it('anchors phase to project bar one and clips at a partial loop boundary', () => {
    const notes = generateMelody({
      project,
      generator,
      customPattern: pattern,
      rangeStartStep: 35,
      rangeEndStep: 50,
      rng: () => 0.5
    })
    expect(notes.map((note) => [note.step, note.durationSteps])).toEqual([
      [39, 5],
      [48, 2]
    ])
  })

  it('returns no melody when custom pattern is empty', () => {
    expect(generateMelody({ project, generator, customPattern: { bars: 1, events: [] } })).toEqual([])
  })

  it('keeps motif letters distinguishable in pitch across bars (ABAC)', () => {
    // A constant rng would make the raw material identical across bars by itself,
    // so a seeded LCG keeps the per-bar input distinct and the test deterministic.
    const makeRng = (seedStart: number) => {
      let seed = seedStart
      return (): number => {
        seed = (seed * 1664525 + 1013904223) % 4294967296
        return seed / 4294967296
      }
    }
    const barPitches = (motif: 'ABAC' | 'FREE'): string[] => {
      const notes = generateMelody({
        project,
        generator: { ...generator, motif, motifVariation: 0 },
        customPattern: pattern,
        rng: makeRng(7)
      })
      return [0, 1, 2, 3].map((bar) =>
        notes
          .filter((note) => Math.floor(note.step / 16) === bar)
          .map((note) => note.pitch)
          .join(',')
      )
    }

    const abac = barPitches('ABAC')
    const free = barPitches('FREE')

    // Task 45 keeps zero-intensity repeats literal and derives contrasting pitch
    // material from A; free generation is no longer the reference for B/C.
    expect(abac[2]).toBe(abac[0])
    expect(abac[1]).not.toBe(abac[0])
    // A probabilistic floor need not change every sparse phrase for every seed.
    expect(abac[3]).not.toBe(free[3])
    expect(abac[0]).toBe(free[0])
    expect(abac[1]).not.toBe(free[1])
  })
})
