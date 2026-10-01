import { describe, expect, it } from 'vitest'
import {
  accumulateStereoSamples,
  createStereoMeterMeasurements,
  toStereoMeterReading
} from '@/core/audio-analysis/stereo-metering'

describe('stereo metering', () => {
  it('retains an impulse shorter than a UI frame on the right channel', () => {
    const measurements = createStereoMeterMeasurements()
    accumulateStereoSamples(measurements, new Float32Array(128), new Float32Array([0, 0, 1, 0]))

    const reading = toStereoMeterReading(measurements)
    expect(reading.leftPeakDb).toBe(-Infinity)
    expect(reading.rightPeakDb).toBe(0)
    expect(reading.overloadSamples).toBe(0)
  })

  it('calculates independent stereo sample peaks and RMS values', () => {
    const measurements = createStereoMeterMeasurements()
    accumulateStereoSamples(measurements, new Float32Array([0.5, -0.5]), new Float32Array([1, -1]))

    const reading = toStereoMeterReading(measurements)
    expect(reading.leftPeakDb).toBeCloseTo(-6.0206, 3)
    expect(reading.rightPeakDb).toBe(0)
    expect(reading.leftRmsDb).toBeCloseTo(-6.0206, 3)
    expect(reading.rightRmsDb).toBe(0)
  })

  it('reports silence, overloads and non-finite input separately', () => {
    const measurements = createStereoMeterMeasurements()
    accumulateStereoSamples(measurements, new Float32Array([0, 0]), new Float32Array([1.25, Number.NaN]))

    const reading = toStereoMeterReading(measurements)
    expect(reading.leftRmsDb).toBe(-Infinity)
    expect(reading.overloadSamples).toBe(1)
    expect(reading.nonFiniteSamples).toBe(1)
  })
})
