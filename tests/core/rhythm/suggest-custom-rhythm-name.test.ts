import { describe, expect, it } from 'vitest'
import { suggestCustomRhythmName } from '../../../src/core/rhythm/suggest-custom-rhythm-name'
import type { CustomRhythmPattern } from '../../../src/core/schemas/custom-rhythm.schema'

describe('suggestCustomRhythmName', () => {
  it('names an empty pattern as open space and includes its length', () => {
    expect(suggestCustomRhythmName({ bars: 2, events: [] })).toBe('Open Space (2 bars)')
  })

  it('describes a beat-led pattern with its hit count', () => {
    const pattern: CustomRhythmPattern = {
      bars: 1,
      events: [0, 4, 8, 12].map((step) => ({ step, lengthSteps: 2, velocity: 92 }))
    }
    expect(suggestCustomRhythmName(pattern)).toBe('4-hit Driving Pulse (1 bar)')
  })

  it('recognizes offbeat and sixteenth-note emphasis', () => {
    const offbeat: CustomRhythmPattern = {
      bars: 1,
      events: [2, 6, 10, 14].map((step) => ({ step, lengthSteps: 2, velocity: 92 }))
    }
    const sixteenths: CustomRhythmPattern = {
      bars: 1,
      events: [1, 3, 5, 7].map((step) => ({ step, lengthSteps: 1, velocity: 92 }))
    }

    expect(suggestCustomRhythmName(offbeat)).toBe('4-hit Offbeat Groove (1 bar)')
    expect(suggestCustomRhythmName(sixteenths)).toBe('4-hit Sixteenth Drive (1 bar)')
  })

  it('returns the same name for the same pattern', () => {
    const pattern: CustomRhythmPattern = {
      bars: 1,
      events: [0, 3, 8].map((step) => ({ step, lengthSteps: 1, velocity: 92 }))
    }
    expect(suggestCustomRhythmName(pattern)).toBe(suggestCustomRhythmName(pattern))
  })

  it('numbers an automatic name when it already exists', () => {
    const pattern: CustomRhythmPattern = { bars: 1, events: [{ step: 0, lengthSteps: 4, velocity: 92 }] }
    const base = suggestCustomRhythmName(pattern)
    expect(suggestCustomRhythmName(pattern, [base, `${base} 2`])).toBe(`${base} 3`)
  })
})
