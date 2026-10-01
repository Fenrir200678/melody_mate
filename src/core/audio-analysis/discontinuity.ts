import { linearToDecibels } from './stereo-metering'

export interface DiscontinuityReport {
  /** Largest absolute sample-to-sample step across all analysed frames. */
  maxStepLinear: number
  maxStepDb: number
  /** Frame index of the largest step, measured from the start of the analysed window. */
  maxStepFrame: number
  channel: 'left' | 'right'
  /** Steps that exceed the given discontinuity threshold. */
  stepsAboveThreshold: number
  threshold: number
  frames: number
}

/**
 * Detects abrupt waveform discontinuities (clicks, graph cuts, dropped voices) as large
 * sample-to-sample steps. A step above roughly half of full scale cannot be produced by smooth
 * envelope or filter movement at common sample rates, so it is used here as evidence that a
 * voice graph was cut rather than faded. It is a numerical diagnostic, not a listening test.
 */
export function analyseDiscontinuities(left: Float32Array, right: Float32Array, threshold = 0.5): DiscontinuityReport {
  let maxStepLinear = 0
  let maxStepFrame = 0
  let channel: 'left' | 'right' = 'left'
  let stepsAboveThreshold = 0
  const frames = Math.max(left.length, right.length)

  const scan = (samples: Float32Array, name: 'left' | 'right') => {
    let previous = samples.length > 0 ? samples[0] : 0
    for (let frame = 0; frame < samples.length; frame += 1) {
      const sample = samples[frame]
      const step = Math.abs(sample - previous)
      if (step > threshold) stepsAboveThreshold += 1
      if (step > maxStepLinear) {
        maxStepLinear = step
        maxStepFrame = frame
        channel = name
      }
      previous = sample
    }
  }

  scan(left, 'left')
  scan(right, 'right')

  return {
    maxStepLinear,
    maxStepDb: linearToDecibels(maxStepLinear),
    maxStepFrame,
    channel,
    stepsAboveThreshold,
    threshold,
    frames
  }
}
