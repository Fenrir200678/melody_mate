export interface StereoChannelMeasurements {
  peak: number
  rms: number
  overloadSamples: number
  nonFiniteSamples: number
}

export interface StereoMeterMeasurements {
  left: StereoChannelMeasurements
  right: StereoChannelMeasurements
  frames: number
}

export interface StereoMeterReading {
  leftPeakDb: number
  rightPeakDb: number
  leftRmsDb: number
  rightRmsDb: number
  overloadSamples: number
  nonFiniteSamples: number
  frames: number
}

export function createStereoMeterMeasurements(): StereoMeterMeasurements {
  return {
    left: { peak: 0, rms: 0, overloadSamples: 0, nonFiniteSamples: 0 },
    right: { peak: 0, rms: 0, overloadSamples: 0, nonFiniteSamples: 0 },
    frames: 0
  }
}

function accumulateChannel(samples: Float32Array | undefined, channel: StereoChannelMeasurements): number {
  if (!samples) return 0
  for (const sample of samples) {
    if (!Number.isFinite(sample)) {
      channel.nonFiniteSamples++
      continue
    }
    const magnitude = Math.abs(sample)
    channel.peak = Math.max(channel.peak, magnitude)
    channel.rms += sample * sample
    if (magnitude > 1) channel.overloadSamples++
  }
  return samples.length
}

export function accumulateStereoSamples(
  measurements: StereoMeterMeasurements,
  left?: Float32Array,
  right?: Float32Array
): StereoMeterMeasurements {
  const frames = Math.max(accumulateChannel(left, measurements.left), accumulateChannel(right, measurements.right))
  measurements.frames += frames
  return measurements
}

export function linearToDecibels(value: number): number {
  return value > 0 && Number.isFinite(value) ? 20 * Math.log10(value) : -Infinity
}

export function toStereoMeterReading(measurements: StereoMeterMeasurements): StereoMeterReading {
  const frames = Math.max(1, measurements.frames)
  return {
    leftPeakDb: linearToDecibels(measurements.left.peak),
    rightPeakDb: linearToDecibels(measurements.right.peak),
    leftRmsDb: linearToDecibels(Math.sqrt(measurements.left.rms / frames)),
    rightRmsDb: linearToDecibels(Math.sqrt(measurements.right.rms / frames)),
    overloadSamples: measurements.left.overloadSamples + measurements.right.overloadSamples,
    nonFiniteSamples: measurements.left.nonFiniteSamples + measurements.right.nonFiniteSamples,
    frames: measurements.frames
  }
}
