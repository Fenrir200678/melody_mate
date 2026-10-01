import { describe, expect, it } from 'vitest'
import { generateRhythmOnsets } from '../../../src/core/generator/rhythm-onsets'
import { GeneratorParamsSchema } from '../../../src/core/schemas/generator.schema'
import {
  clearPattern,
  copyEuclidean,
  copyPreset,
  duplicateBar,
  erase,
  expandPattern,
  insert,
  move,
  resize,
  resizePattern,
  setVelocity
} from '../../../src/core/rhythm/custom-pattern'
import type { CustomRhythmPattern } from '../../../src/core/schemas/custom-rhythm.schema'

const empty: CustomRhythmPattern = { bars: 2, events: [] }

describe('custom rhythm edits', () => {
  it('copies Euclidean rotation and onset phase exactly', () => {
    expect(copyEuclidean(3, 8, 1, '8n')).toEqual({
      ok: true,
      pattern: {
        bars: 1,
        events: [
          { step: 2, lengthSteps: 4, velocity: 92 },
          { step: 8, lengthSteps: 4, velocity: 92 },
          { step: 14, lengthSteps: 2, velocity: 92 }
        ]
      }
    })
  })

  it('reduces a repeating 12-step 16n cycle to its smallest bar-aligned period', () => {
    const result = copyEuclidean(3, 12, 0, '16n')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.pattern.bars).toBe(1)
    expect(result.pattern.events.map((event) => event.step)).toEqual([0, 4, 8, 12])
    for (const event of result.pattern.events) {
      if (event.step + 4 < 16) expect(result.pattern.events.some((next) => next.step === event.step + 4)).toBe(true)
    }
  })

  it('preserves the active Euclidean onset phase across repeated custom bars', () => {
    const params = GeneratorParamsSchema.parse({
      rhythmMode: 'euclidean',
      euclideanPulses: 5,
      euclideanSteps: 12,
      euclideanRotation: 2,
      euclideanSubdivision: '16n',
      restProbability: 0
    })
    const copied = copyEuclidean(5, 12, 2, '16n')
    expect(copied.ok).toBe(true)
    if (!copied.ok) return
    expect(copied.pattern.bars).toBe(3)

    const fromCustom = expandPattern(copied.pattern, { startStep: 0, endStep: 96 }).map((event) => event.absoluteStep)
    const fromEuclidean = generateRhythmOnsets({
      generator: params,
      rangeStartStep: 0,
      rangeEndStep: 96,
      rng: () => 0.5
    }).map((event) => event.step)
    expect(fromCustom).toEqual(fromEuclidean)
  })

  it('reduces a saturated 32-step pattern and rejects 32n and genuine long cycles', () => {
    expect(copyEuclidean(32, 32, 0, '16n')).toEqual({
      ok: true,
      pattern: {
        bars: 1,
        events: Array.from({ length: 16 }, (_, step) => ({ step, lengthSteps: 1, velocity: 92 }))
      }
    })
    expect(copyEuclidean(2, 8, 0, '32n')).toEqual({
      ok: false,
      error: '32n Euclidean patterns cannot be represented on the sixteenth-note grid'
    })
    expect(copyEuclidean(5, 17, 0, '16n')).toEqual({
      ok: false,
      error: 'Euclidean cycle needs more than four bars to repeat exactly on the sixteenth-note grid'
    })
  })

  it('inserts and sorts events, and rejects collisions atomically', () => {
    const first = insert(empty, { step: 4, lengthSteps: 2, velocity: 92 })
    expect(first.ok && first.pattern.events[0].step).toBe(4)
    const collision = insert(first.ok ? first.pattern : empty, { step: 5, lengthSteps: 1, velocity: 72 })
    expect(collision.ok).toBe(false)
    expect(first.ok && first.pattern.events).toHaveLength(1)
  })

  it('moves, resizes, and erases by onset', () => {
    const start = { bars: 1, events: [{ step: 2, lengthSteps: 2, velocity: 92 }] } satisfies CustomRhythmPattern
    const moved = move(start, 2, 5)
    const resized = moved.ok ? resize(moved.pattern, 5, 4) : moved
    const removed = resized.ok ? erase(resized.pattern, 5) : resized
    expect(removed).toEqual({ ok: true, pattern: { bars: 1, events: [] } })
    expect(move(start, 2, 15).ok).toBe(false)
  })

  it('duplicates the preceding bar and truncates copied notes at its line', () => {
    const source = { bars: 2, events: [{ step: 12, lengthSteps: 8, velocity: 112 }] } satisfies CustomRhythmPattern
    expect(duplicateBar(source, 0)).toEqual({
      ok: true,
      pattern: {
        bars: 2,
        events: [
          { step: 12, lengthSteps: 8, velocity: 112 },
          { step: 28, lengthSteps: 4, velocity: 112 }
        ]
      }
    })
  })

  it('sets event velocity and clears the pattern', () => {
    const source = { bars: 1, events: [{ step: 2, lengthSteps: 2, velocity: 92 }] } satisfies CustomRhythmPattern
    const accented = setVelocity(source, 2, 112)
    expect(accented).toEqual({ ok: true, pattern: { bars: 1, events: [{ step: 2, lengthSteps: 2, velocity: 112 }] } })
    expect(clearPattern(source)).toEqual({ ok: true, pattern: { bars: 1, events: [] } })
    expect(setVelocity(source, 2, 0).ok).toBe(false)
  })

  it('trims notes when shortening and keeps empty bars when extending', () => {
    const source = {
      bars: 2,
      events: [
        { step: 14, lengthSteps: 8, velocity: 92 },
        { step: 22, lengthSteps: 2, velocity: 72 }
      ]
    } satisfies CustomRhythmPattern
    expect(resizePattern(source, 1)).toEqual({
      ok: true,
      pattern: { bars: 1, events: [{ step: 14, lengthSteps: 2, velocity: 92 }] }
    })
    expect(resizePattern(source, 4).ok).toBe(true)
  })

  it('converts preset subdivision exactly and rejects patterns that do not fit', () => {
    expect(
      copyPreset({
        id: 'a',
        name: 'A',
        category: 'melody',
        subdivision: '8n',
        steps: [
          { isNote: true, durationSteps: 2 },
          { isNote: false, durationSteps: 2 }
        ]
      })
    ).toEqual({ ok: true, pattern: { bars: 1, events: [{ step: 0, lengthSteps: 4, velocity: 92 }] } })
    expect(
      copyPreset({
        id: 'a',
        name: 'A',
        category: 'melody',
        subdivision: '16n',
        steps: [{ isNote: true, durationSteps: 17 }]
      }).ok
    ).toBe(false)
  })

  it('expands from project step zero and clips at the selected range boundary', () => {
    const pattern = { bars: 2, events: [{ step: 2, lengthSteps: 4, velocity: 92 }] } satisfies CustomRhythmPattern
    expect(expandPattern(pattern, { startStep: 33, endStep: 36 })).toEqual([
      { step: 2, lengthSteps: 2, velocity: 92, absoluteStep: 34 }
    ])
  })
})
