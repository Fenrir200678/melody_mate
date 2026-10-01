import { describe, expect, it } from 'vitest'
import {
  createCeilingClipCurve,
  LIMITER_CEILING_TOLERANCE,
  lookaheadMsToSamples,
  PeakLimiter
} from '@/core/audio-dsp/peak-limiter'
import { decibelsToGain } from '@/core/audio/gain-staging'

const SAMPLE_RATE = 48000
const CEILING = decibelsToGain(-1)

function process(left: Float32Array, right?: Float32Array, limiter?: PeakLimiter): [Float32Array, Float32Array] {
  const engine = limiter ?? new PeakLimiter({ sampleRate: SAMPLE_RATE })
  const outLeft = new Float32Array(left.length)
  const outRight = new Float32Array((right ?? left).length)
  engine.process(left, right ?? left, outLeft, outRight)
  return [outLeft, outRight]
}

function peakOf(...channels: Float32Array[]): number {
  let peak = 0
  for (const channel of channels) {
    for (const sample of channel) peak = Math.max(peak, Math.abs(sample))
  }
  return peak
}

describe('PeakLimiter ceiling', () => {
  it('passes silence through unchanged with zero reduction and no faults', () => {
    const limiter = new PeakLimiter({ sampleRate: SAMPLE_RATE })
    const [left, right] = process(new Float32Array(512), undefined, limiter)

    expect(peakOf(left, right)).toBe(0)
    const report = limiter.getReport()
    expect(report.gainReductionDb).toBe(0)
    expect(report.sanitizedSamples).toBe(0)
  })

  it('bounds an impulse that is far above the ceiling', () => {
    const limiter = new PeakLimiter({ sampleRate: SAMPLE_RATE })
    const input = new Float32Array(2048)
    input[100] = 12
    const [left, right] = process(input, input, limiter)

    expect(peakOf(left, right)).toBeLessThanOrEqual(CEILING + LIMITER_CEILING_TOLERANCE)
    expect(peakOf(left, right)).toBeGreaterThan(CEILING * 0.99)
    expect(limiter.getReport().gainReductionDb).toBeGreaterThan(20)
  })

  it('bounds a sustained overload and reports continuous reduction', () => {
    const limiter = new PeakLimiter({ sampleRate: SAMPLE_RATE })
    const input = new Float32Array(9600)
    input.fill(2)
    const [left, right] = process(input, input, limiter)

    expect(peakOf(left, right)).toBeLessThanOrEqual(CEILING + LIMITER_CEILING_TOLERANCE)
    expect(limiter.getReport().gainReductionDb).toBeGreaterThan(5)
  })

  it('bounds high-frequency full-scale alternation', () => {
    const limiter = new PeakLimiter({ sampleRate: SAMPLE_RATE })
    const input = new Float32Array(4096)
    for (let index = 0; index < input.length; index += 1) input[index] = index % 2 === 0 ? 1.4 : -1.4
    const [left, right] = process(input, input, limiter)

    expect(peakOf(left, right)).toBeLessThanOrEqual(CEILING + LIMITER_CEILING_TOLERANCE)
  })

  it('holds the ceiling for a correlated stereo overload', () => {
    const limiter = new PeakLimiter({ sampleRate: SAMPLE_RATE })
    const input = new Float32Array(4800)
    input.fill(3)
    const [left, right] = process(input, input, limiter)

    expect(peakOf(left, right)).toBeLessThanOrEqual(CEILING + LIMITER_CEILING_TOLERANCE)
    for (let index = 0; index < left.length; index += 1) {
      expect(Math.abs(left[index] - right[index])).toBeLessThan(1e-9)
    }
  })

  it('links gain across channels so the stereo balance is preserved', () => {
    const limiter = new PeakLimiter({ sampleRate: SAMPLE_RATE })
    const length = 4096
    const left = new Float32Array(length)
    const right = new Float32Array(length)
    for (let index = 0; index < length; index += 1) {
      left[index] = 1.5
      right[index] = 0.75
    }
    const [outLeft, outRight] = process(left, right, limiter)

    expect(peakOf(outLeft)).toBeLessThanOrEqual(CEILING + LIMITER_CEILING_TOLERANCE)
    const settledLeft = outLeft[length - 1]
    const settledRight = outRight[length - 1]
    expect(settledLeft / settledRight).toBeCloseTo(2, 5)
    expect(settledLeft).toBeGreaterThan(0)
  })

  it('sanitizes non-finite samples and counts them without leaking NaN', () => {
    const limiter = new PeakLimiter({ sampleRate: SAMPLE_RATE })
    const left = new Float32Array([Number.NaN, Number.POSITIVE_INFINITY, 1.2, 0])
    const right = new Float32Array([0, Number.NEGATIVE_INFINITY, 0, 0])
    const [outLeft, outRight] = process(left, right, limiter)

    for (const sample of [...outLeft, ...outRight]) expect(Number.isFinite(sample)).toBe(true)
    expect(limiter.getReport().sanitizedSamples).toBe(3)
    expect(peakOf(outLeft, outRight)).toBeLessThanOrEqual(CEILING + LIMITER_CEILING_TOLERANCE)
  })
})

describe('PeakLimiter timing and settings', () => {
  it('delays the signal by the configured lookahead', () => {
    const lookaheadMs = 2
    const limiter = new PeakLimiter({ sampleRate: SAMPLE_RATE, lookaheadMs })
    const latency = lookaheadMsToSamples(lookaheadMs, SAMPLE_RATE)
    expect(limiter.latencySamples).toBe(latency)
    expect(limiter.getLatencySeconds()).toBeCloseTo(latency / SAMPLE_RATE, 12)

    const input = new Float32Array(1024)
    input[10] = 0.5
    const [left] = process(input, undefined, limiter)

    expect(left[10 + latency]).toBeCloseTo(0.5, 6)
    expect(left[10]).toBeCloseTo(0, 9)
  })

  it('recovers to unity after an overload within a bounded release', () => {
    const releaseMs = 20
    const limiter = new PeakLimiter({ sampleRate: SAMPLE_RATE, releaseMs })
    const overload = new Float32Array(2000)
    overload.fill(2)
    process(overload, undefined, limiter)

    const quiet = new Float32Array(SAMPLE_RATE)
    quiet.fill(0.1)
    const [left] = process(quiet, undefined, limiter)

    // One-pole recovery: after several time constants the small signal is essentially untouched.
    expect(left[left.length - 1]).toBeCloseTo(0.1, 2)
  })

  it('applies a lowered ceiling immediately and raises it without a jump', () => {
    const limiter = new PeakLimiter({ sampleRate: SAMPLE_RATE, ceilingDb: 0 })
    const overload = new Float32Array(4800)
    overload.fill(1)

    limiter.setCeilingDb(-12)
    const [lowered] = process(overload, undefined, limiter)
    const loweredCeiling = decibelsToGain(-12)
    expect(peakOf(lowered)).toBeLessThanOrEqual(loweredCeiling + LIMITER_CEILING_TOLERANCE)

    limiter.setCeilingDb(0)
    const short = new Float32Array(64)
    short.fill(1)
    const [raised] = process(short, undefined, limiter)
    // The first sample after raising must not jump straight back to unity ceiling.
    expect(raised[0]).toBeLessThan(1)
  })

  it('reports latency, output peak and maximum reduction', () => {
    const limiter = new PeakLimiter({ sampleRate: SAMPLE_RATE, lookaheadMs: 3 })
    const input = new Float32Array(4096)
    input.fill(4)
    process(input, undefined, limiter)

    const report = limiter.getReport()
    expect(report.latencySamples).toBe(lookaheadMsToSamples(3, SAMPLE_RATE))
    expect(report.latencyMs).toBeCloseTo(limiter.getLatencySeconds() * 1000, 9)
    expect(report.outputPeak).toBeLessThanOrEqual(CEILING + LIMITER_CEILING_TOLERANCE)
    expect(report.maxGainReductionDb).toBeGreaterThan(report.gainReductionDb - 1e-9)

    limiter.resetReport()
    expect(limiter.getReport().gainReductionDb).toBe(0)
    expect(limiter.getReport().outputPeak).toBe(0)
  })

  it('resets all state back to unity', () => {
    const limiter = new PeakLimiter({ sampleRate: SAMPLE_RATE })
    const input = new Float32Array(2048)
    input.fill(5)
    process(input, undefined, limiter)
    limiter.reset()

    const [left] = process(new Float32Array(512), undefined, limiter)
    expect(peakOf(left)).toBe(0)
    expect(limiter.getReport().maxGainReductionDb).toBe(0)
    expect(limiter.getReport().sanitizedSamples).toBe(0)
  })

  it('maintains ceiling when sample index crosses 32-bit signed boundary (2^31 - 1)', () => {
    const limiter = new PeakLimiter({ sampleRate: SAMPLE_RATE })
    // Simulate long-running session reaching 2^31 - 1 frames
    ;(limiter as unknown as { sampleIndex: number }).sampleIndex = 2147483645

    const overload = new Float32Array(512)
    overload.fill(3)
    const [left, right] = process(overload, overload, limiter)

    expect(peakOf(left, right)).toBeLessThanOrEqual(CEILING + LIMITER_CEILING_TOLERANCE)
    expect(limiter.getReport().gainReductionDb).toBeGreaterThan(5)
  })
})

describe('limiter helpers', () => {
  it('maps lookahead milliseconds to samples and clamps the range', () => {
    expect(lookaheadMsToSamples(2, 48000)).toBe(96)
    expect(lookaheadMsToSamples(2, 44100)).toBe(88)
    expect(lookaheadMsToSamples(-5, 48000)).toBe(0)
    expect(lookaheadMsToSamples(1000, 48000)).toBe(lookaheadMsToSamples(20, 48000))
    expect(lookaheadMsToSamples(2, 0)).toBe(96)
  })

  it('builds a hard ceiling clip curve bounded by the ceiling', () => {
    const ceiling = decibelsToGain(-1)
    const curve = createCeilingClipCurve(ceiling, 257)
    for (const value of curve) {
      expect(Math.abs(value)).toBeLessThanOrEqual(ceiling + 1e-9)
    }
    expect(curve[0]).toBeCloseTo(-ceiling, 6)
    expect(curve[curve.length - 1]).toBeCloseTo(ceiling, 6)
    expect(curve[(curve.length - 1) / 2]).toBeCloseTo(0, 6)
  })
})
