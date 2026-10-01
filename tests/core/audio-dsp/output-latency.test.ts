import { describe, expect, it } from 'vitest'
import {
  compensateOutputLatency,
  latencySamplesToSeconds,
  transportSecondsToPlayheadStep
} from '@/core/audio-dsp/output-latency'

describe('output latency display policy', () => {
  it('subtracts the protection latency and never goes below zero', () => {
    expect(compensateOutputLatency(2, 0.002)).toBeCloseTo(1.998, 9)
    expect(compensateOutputLatency(0.001, 0.002)).toBe(0)
    expect(compensateOutputLatency(2, Number.NaN)).toBe(2)
    expect(compensateOutputLatency(Number.POSITIVE_INFINITY, 0.002)).toBe(0)
  })

  it('converts compensated transport time into a continuous playhead step', () => {
    // 120 BPM sixteenth = 0.125s, 2ms latency removes 0.016 steps
    expect(transportSecondsToPlayheadStep(2, 0.125, 0.002)).toBeCloseTo(15.984, 6)
    expect(transportSecondsToPlayheadStep(2, 0.125, 0)).toBeCloseTo(16, 6)
    expect(transportSecondsToPlayheadStep(2, 0, 0.002)).toBe(0)
  })

  it('converts sample latency to seconds for the shared policy', () => {
    expect(latencySamplesToSeconds(96, 48000)).toBeCloseTo(0.002, 9)
    expect(latencySamplesToSeconds(96, 0)).toBe(0)
    expect(latencySamplesToSeconds(-1, 48000)).toBe(0)
  })
})
