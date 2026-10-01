import { describe, expect, it } from 'vitest'
import { analyseDiscontinuities } from '../../../src/core/audio-analysis/discontinuity'

function flatten(samples: number[]): Float32Array {
  return Float32Array.from(samples)
}

describe('analyseDiscontinuities', () => {
  it('reports no step for silence', () => {
    const report = analyseDiscontinuities(new Float32Array(64), new Float32Array(64))

    expect(report.maxStepLinear).toBe(0)
    expect(report.stepsAboveThreshold).toBe(0)
    expect(report.frames).toBe(64)
  })

  it('flags an abrupt graph cut as a large single step', () => {
    const left = flatten([0, 0, 0, 0.9, 0.9, 0.9])
    const report = analyseDiscontinuities(left, new Float32Array(6))

    expect(report.maxStepLinear).toBeCloseTo(0.9, 6)
    expect(report.stepsAboveThreshold).toBe(1)
    expect(report.maxStepFrame).toBe(3)
    expect(report.channel).toBe('left')
  })

  it('treats a smooth fade as continuous', () => {
    const fade = Array.from({ length: 64 }, (_, index) => index / 64)
    const report = analyseDiscontinuities(flatten(fade), flatten(fade))

    expect(report.stepsAboveThreshold).toBe(0)
    expect(report.maxStepLinear).toBeCloseTo(1 / 64, 6)
  })

  it('finds the largest step on either channel', () => {
    const left = flatten([0, 0.1, 0.2, 0.3])
    const right = flatten([0, 0, 0, -0.8])
    const report = analyseDiscontinuities(left, right)

    expect(report.channel).toBe('right')
    expect(report.maxStepLinear).toBeCloseTo(0.8, 6)
  })

  it('honours a custom threshold', () => {
    const signal = flatten([0, 0.2, 0.4, 0.6])
    expect(analyseDiscontinuities(signal, signal, 0.9).stepsAboveThreshold).toBe(0)
    // Counted across both channels: three steps of 0.2 per channel.
    expect(analyseDiscontinuities(signal, signal, 0.1).stepsAboveThreshold).toBe(6)
  })
})
