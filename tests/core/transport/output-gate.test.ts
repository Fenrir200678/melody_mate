import { describe, expect, it } from 'vitest'
import { getMidiDispatchAdvanceSeconds, getOutputGate } from '../../../src/core/transport/output-gate'

describe('transport output gate', () => {
  it('preserves a non-looping note gate', () => {
    expect(getOutputGate(2.25, 1.5, 12, 0.125, { isLooping: false, loopEndStep: 32 })).toEqual({
      durationSeconds: 1.5,
      offTimeSeconds: 3.75,
      loopEndTimeSeconds: undefined
    })
  })

  it('clips a note that begins before the loop end at the musical loop boundary', () => {
    const gate = getOutputGate(3, 2, 12, 0.125, { isLooping: true, loopEndStep: 20 })

    expect(gate).toEqual({ durationSeconds: 1, offTimeSeconds: 4, loopEndTimeSeconds: 4 })
  })

  it('clips a grooved or rounded start inside the loop using the actual start position', () => {
    const gate = getOutputGate(5.04, 0.9, 18.32, 0.1, { isLooping: true, loopEndStep: 24 })

    expect(gate.durationSeconds).toBeCloseTo(0.568)
    expect(gate.offTimeSeconds).toBeCloseTo(5.608)
    expect(gate.loopEndTimeSeconds).toBeCloseTo(5.608)
  })

  it('does not gate a note whose start is at or beyond the loop end', () => {
    const atEnd = getOutputGate(2, 0.5, 16, 0.125, { isLooping: true, loopEndStep: 16 })
    const beyondEnd = getOutputGate(2.25, 0.5, 18, 0.125, { isLooping: true, loopEndStep: 16 })

    expect(atEnd.durationSeconds).toBe(0)
    expect(atEnd.offTimeSeconds).toBe(2)
    expect(atEnd.loopEndTimeSeconds).toBe(2)
    expect(beyondEnd.durationSeconds).toBe(0)
    expect(beyondEnd.offTimeSeconds).toBe(2.25)
    expect(beyondEnd.loopEndTimeSeconds).toBe(2.25)
  })

  it('subtracts the update interval from lookahead for conservative MIDI advance', () => {
    expect(getMidiDispatchAdvanceSeconds(0.1, 0.02)).toBeCloseTo(0.08)
    expect(getMidiDispatchAdvanceSeconds(0.01, 0.02)).toBe(0)
  })
})
