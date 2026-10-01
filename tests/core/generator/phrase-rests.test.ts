import { describe, expect, it } from 'vitest'
import { applyPhraseRests } from '../../../src/core/generator/phrase-rests'

describe('applyPhraseRests', () => {
  const onsets = Array.from({ length: 8 }, (_, step) => ({ step, durationSteps: 1 }))

  it('preserves the first onset, strong midpoint, final cadence, and at least two notes per bar', () => {
    const result = applyPhraseRests(onsets, 1, 8, () => 0)

    expect(result.map(({ step }) => step)).toEqual([0, 4, 7])
  })

  it('protects the first onset of each bar and keeps sparse bars intact', () => {
    const sparse = [0, 3, 8, 12, 16].map((step) => ({ step, durationSteps: 1 }))
    const result = applyPhraseRests(sparse, 1, 8, () => 0)

    expect(result).toEqual(sparse)
  })

  it('retains natural preset rests and preserves the input ordering', () => {
    const preset = [
      { step: 9, durationSteps: 1 },
      { step: 0, durationSteps: 2 },
      { step: 4, durationSteps: 1 },
      { step: 2, durationSteps: 1 }
    ]

    const result = applyPhraseRests(preset, 0, 8, () => 0)
    expect(result).toEqual(preset)
  })

  it('uses injected randomness deterministically for eligible onsets', () => {
    const keep = applyPhraseRests(onsets, 0.5, 8, () => 0.9)
    const rest = applyPhraseRests(onsets, 0.5, 8, () => 0.1)

    expect(keep.map(({ step }) => step)).toEqual(onsets.map(({ step }) => step))
    expect(rest.map(({ step }) => step)).toEqual([0, 4, 7])
  })
})
