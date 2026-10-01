import { describe, expect, it } from 'vitest'
import { computeLoopRangeFromSelection } from '../../../src/core/transport/loop.range'

const note = (step: number, durationSteps: number) => ({ step, durationSteps })

describe('computeLoopRangeFromSelection', () => {
  it('returns null for an empty selection', () => {
    expect(computeLoopRangeFromSelection([], 4, 64)).toBeNull()
  })

  it('snaps the loop range outward to the grid', () => {
    const range = computeLoopRangeFromSelection([note(1, 1), note(6, 2)], 4, 64)
    expect(range).toEqual({ startStep: 0, endStep: 8 })
  })

  it('clamps the loop end to the project length', () => {
    const range = computeLoopRangeFromSelection([note(62, 4)], 4, 64)
    expect(range).toEqual({ startStep: 60, endStep: 64 })
  })

  it('guarantees a minimum span of one grid step', () => {
    const range = computeLoopRangeFromSelection([note(0, 1)], 4, 64)
    expect(range).toEqual({ startStep: 0, endStep: 4 })
  })

  it('treats sub-step snap values as single steps', () => {
    const range = computeLoopRangeFromSelection([note(1, 1)], 0, 64)
    expect(range).toEqual({ startStep: 1, endStep: 2 })
  })
})
