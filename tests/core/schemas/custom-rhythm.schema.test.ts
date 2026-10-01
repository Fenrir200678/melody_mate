import { describe, expect, it } from 'vitest'
import { CustomRhythmPatternSchema } from '../../../src/core/schemas/custom-rhythm.schema'

describe('CustomRhythmPatternSchema', () => {
  it('accepts an ordered, non-overlapping pattern within four bars', () => {
    expect(
      CustomRhythmPatternSchema.safeParse({
        bars: 2,
        events: [
          { step: 0, lengthSteps: 3, velocity: 72 },
          { step: 18, lengthSteps: 14, velocity: 127 }
        ]
      }).success
    ).toBe(true)
  })

  it.each([
    [{ bars: 1, events: [{ step: 0.5, lengthSteps: 1, velocity: 90 }] }, 'integer onset'],
    [{ bars: 1, events: [{ step: 0, lengthSteps: 17, velocity: 90 }] }, 'pattern boundary'],
    [
      {
        bars: 1,
        events: [
          { step: 0, lengthSteps: 3, velocity: 90 },
          { step: 2, lengthSteps: 1, velocity: 90 }
        ]
      },
      'overlap'
    ],
    [
      {
        bars: 1,
        events: [
          { step: 2, lengthSteps: 1, velocity: 90 },
          { step: 1, lengthSteps: 1, velocity: 90 }
        ]
      },
      'order'
    ],
    [{ bars: 1, events: [{ step: 0, lengthSteps: 1, velocity: 128 }] }, 'velocity']
  ])('rejects invalid %s', (value) => {
    expect(CustomRhythmPatternSchema.safeParse(value).success).toBe(false)
  })
})
