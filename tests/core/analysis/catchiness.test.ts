import { describe, expect, it } from 'vitest'
import { CATCHINESS_WEIGHTS, catchinessLabel, catchinessScore } from '@/core/analysis/catchiness'
import type { MelodyMetrics } from '@/core/analysis/types'

const metrics: MelodyMetrics = {
  rangeSemitones: 12,
  rangeLabel: 'C4 – C5',
  motionBalance: { steps: 0.5, leaps: 0.25, repeats: 0.25 },
  syncopationRatio: 0.2,
  chordToneRatio: 0.5,
  repetitionScore: 0.5,
  tensionPerBar: [0.2, 0.6],
  contourClarity: 0.5,
  rhythmPredictability: 0.5,
  resolution: 0.5
}

describe('catchiness', () => {
  it('uses named weights that sum to one', () => {
    expect(Object.values(CATCHINESS_WEIGHTS).reduce((sum, value) => sum + value, 0)).toBe(1)
  })

  it('scores constructed minimum and maximum metrics', () => {
    const zero: MelodyMetrics = {
      ...metrics,
      repetitionScore: 0,
      chordToneRatio: 0,
      contourClarity: 0,
      rhythmPredictability: 0,
      resolution: 0
    }
    const one: MelodyMetrics = {
      ...metrics,
      repetitionScore: 1,
      chordToneRatio: 1,
      contourClarity: 1,
      rhythmPredictability: 1,
      resolution: 1
    }
    expect(catchinessScore(zero)).toBe(0)
    expect(catchinessScore(one)).toBe(100)
    expect(catchinessLabel(catchinessScore(zero))).toBe('sketchy')
    expect(catchinessLabel(catchinessScore(one))).toBe('signature')
    expect(
      catchinessScore({ ...one, repetitionScore: 4, chordToneRatio: 4, contourClarity: 4, rhythmPredictability: 4 })
    ).toBe(100)
  })

  it('renormalizes the score when harmony metrics are unavailable', () => {
    const allRemaining = {
      ...metrics,
      repetitionScore: 1,
      chordToneRatio: null,
      contourClarity: 1,
      rhythmPredictability: 1,
      resolution: null
    } satisfies MelodyMetrics
    const halfRemaining = {
      ...allRemaining,
      repetitionScore: 0.5,
      contourClarity: 0.5,
      rhythmPredictability: 0.5
    } satisfies MelodyMetrics

    expect(catchinessScore(allRemaining)).toBe(100)
    expect(catchinessScore(halfRemaining)).toBe(50)
  })

  it('applies each named weight independently', () => {
    const zero: MelodyMetrics = {
      ...metrics,
      repetitionScore: 0,
      chordToneRatio: 0,
      contourClarity: 0,
      rhythmPredictability: 0,
      resolution: 0
    }
    expect(catchinessScore({ ...zero, repetitionScore: 1 })).toBe(35)
    expect(catchinessScore({ ...zero, chordToneRatio: 1 })).toBe(20)
    expect(catchinessScore({ ...zero, contourClarity: 1 })).toBe(20)
    expect(catchinessScore({ ...zero, rhythmPredictability: 1 })).toBe(15)
    expect(catchinessScore({ ...zero, resolution: 1 })).toBe(10)
  })

  it('clamps negative values and treats NaN safely', () => {
    expect(catchinessScore({ ...metrics, repetitionScore: Number.NaN })).toBe(33)
    expect(catchinessScore({ ...metrics, repetitionScore: -10 })).toBe(33)
  })

  it.each([
    [34, 'sketchy'],
    [35, 'developing'],
    [59, 'developing'],
    [60, 'hooky'],
    [79, 'hooky'],
    [80, 'signature'],
    [Number.NaN, 'sketchy']
  ] as const)('labels score %s as %s', (score, expected) => {
    expect(catchinessLabel(score)).toBe(expected)
  })

  it('clamps scores beyond the label range', () => {
    expect(catchinessLabel(-20)).toBe('sketchy')
    expect(catchinessLabel(120)).toBe('signature')
  })
})
