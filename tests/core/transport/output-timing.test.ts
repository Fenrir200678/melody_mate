import { describe, expect, it } from 'vitest'
import { DEFAULT_MIDI_CLOCK_POLICY, MIDI_OUTPUT_BOUNDS } from '../../../src/config/defaults'
import {
  audioTimeToPerformanceMs,
  outputClockDiscontinuity,
  selectOutputClockAnchor,
  validateMidiAdvanceBudget,
  type OutputClockReading
} from '../../../src/core/transport/output-timing'

const reading = (overrides: Partial<OutputClockReading> = {}): OutputClockReading => ({
  contextTimeSeconds: 12,
  performanceTimeMs: 20_000,
  running: true,
  ...overrides
})

describe('MIDI output clock timing', () => {
  it('maps audio seconds onto performance milliseconds with signed route offsets', () => {
    const anchor = { contextTimeSeconds: 10, performanceTimeMs: 50_000, mode: 'output' as const }
    expect(audioTimeToPerformanceMs(11.25, anchor, 0, 0)).toBe(51_250)
    expect(audioTimeToPerformanceMs(11.25, anchor, 0, 8)).toBe(51_258)
    expect(audioTimeToPerformanceMs(11.25, anchor, 0, -8)).toBe(51_242)
  })

  it('adds internal signal path latency once and supports zero latency fallback paths', () => {
    const anchor = { contextTimeSeconds: 10, performanceTimeMs: 50_000, mode: 'output' as const }
    expect(audioTimeToPerformanceMs(11, anchor, 0.005, 0)).toBe(51_005)
    expect(audioTimeToPerformanceMs(11, anchor, 0, 0)).toBe(51_000)
  })

  it('uses a fresh valid output timestamp and estimates from current clocks otherwise', () => {
    const fresh = reading({
      outputTimestamp: { contextTimeSeconds: 11.9, performanceTimeMs: 19_900 }
    })
    expect(selectOutputClockAnchor(fresh)).toEqual({
      contextTimeSeconds: 11.9,
      performanceTimeMs: 19_900,
      mode: 'output'
    })
    expect(
      selectOutputClockAnchor(
        reading({
          outputTimestamp: { contextTimeSeconds: 11, performanceTimeMs: 19_000 }
        })
      )
    ).toEqual({ contextTimeSeconds: 12, performanceTimeMs: 20_000, mode: 'estimated' })
    expect(
      selectOutputClockAnchor(
        reading({
          outputTimestamp: { contextTimeSeconds: NaN, performanceTimeMs: 19_900 }
        })
      )?.mode
    ).toBe('estimated')
    expect(selectOutputClockAnchor(reading({ running: false }))).toBeNull()
  })

  it('rejects invalid conversion values and route offsets outside configured bounds', () => {
    const anchor = { contextTimeSeconds: 10, performanceTimeMs: 50_000, mode: 'output' as const }
    expect(() => audioTimeToPerformanceMs(-1, anchor, 0, 0)).toThrow(RangeError)
    expect(() => audioTimeToPerformanceMs(11, anchor, -0.001, 0)).toThrow(RangeError)
    expect(() => audioTimeToPerformanceMs(11, anchor, 0, MIDI_OUTPUT_BOUNDS.offsetMs.min - 1)).toThrow(RangeError)
    expect(() => audioTimeToPerformanceMs(11, anchor, 0, MIDI_OUTPUT_BOUNDS.offsetMs.max + 1)).toThrow(RangeError)
    expect(() => audioTimeToPerformanceMs(11, { ...anchor, performanceTimeMs: Infinity }, 0, 0)).toThrow(RangeError)
  })

  it('detects clock discontinuities and accepts ordinary clock advancement', () => {
    const before = reading({ contextTimeSeconds: 10, performanceTimeMs: 10_000 })
    const steady = reading({ contextTimeSeconds: 10.02, performanceTimeMs: 10_020 })
    const jumped = reading({ contextTimeSeconds: 10.02, performanceTimeMs: 10_200 })
    expect(outputClockDiscontinuity(before, steady)).toBe(false)
    expect(outputClockDiscontinuity(before, jumped)).toBe(true)
    expect(outputClockDiscontinuity(before, { ...steady, running: false })).toBe(true)
    expect(DEFAULT_MIDI_CLOCK_POLICY.maxClockJumpMs).toBeGreaterThan(0)
  })

  it('allows negative offsets only when lookahead covers pump and guard budget', () => {
    expect(validateMidiAdvanceBudget(-8, 0.03, 10, 2)).toBe(true)
    expect(validateMidiAdvanceBudget(-8, 0.019, 10, 2)).toBe(false)
    expect(validateMidiAdvanceBudget(0, 0.012, 10, 2)).toBe(true)
    expect(validateMidiAdvanceBudget(0, 0.011, 10, 2)).toBe(false)
    expect(validateMidiAdvanceBudget(0, -0.01, 10, 2)).toBe(false)
    expect(validateMidiAdvanceBudget(0, 0.03, 0, 2)).toBe(false)
  })
})
