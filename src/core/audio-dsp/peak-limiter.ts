import { clamp, decibelsToGain, gainToDecibels } from '../audio/gain-staging'

export const DEFAULT_LIMITER_CEILING_DB = -1
export const DEFAULT_LIMITER_RELEASE_MS = 80
export const DEFAULT_LIMITER_LOOKAHEAD_MS = 2
export const MIN_LIMITER_CEILING_DB = -24
export const MAX_LIMITER_CEILING_DB = 0
export const MIN_LIMITER_RELEASE_MS = 10
export const MAX_LIMITER_RELEASE_MS = 1000
export const MIN_LIMITER_LOOKAHEAD_MS = 0
export const MAX_LIMITER_LOOKAHEAD_MS = 20
export const LIMITER_CEILING_SMOOTHING_MS = 20

/**
 * Stated numerical tolerance for the sample-peak ceiling. The float64 reference DSP stays
 * within ~1e-9; the float32 AudioWorklet path is the binding constraint at ~1e-5.
 */
export const LIMITER_CEILING_TOLERANCE = 1e-4

/** Fixed attenuation applied only by the degraded no-worklet fallback path. */
export const FALLBACK_PROTECTION_GAIN = 0.5

export function clampLimiterCeilingDb(decibels: number): number {
  return clamp(decibels, MIN_LIMITER_CEILING_DB, MAX_LIMITER_CEILING_DB)
}

export function clampLimiterReleaseMs(milliseconds: number): number {
  return clamp(milliseconds, MIN_LIMITER_RELEASE_MS, MAX_LIMITER_RELEASE_MS)
}

export function clampLimiterLookaheadMs(milliseconds: number): number {
  return clamp(milliseconds, MIN_LIMITER_LOOKAHEAD_MS, MAX_LIMITER_LOOKAHEAD_MS)
}

export function lookaheadMsToSamples(milliseconds: number, sampleRate: number): number {
  const rate = Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : 48000
  return Math.max(0, Math.round((clampLimiterLookaheadMs(milliseconds) / 1000) * rate))
}

/**
 * Hard ceiling transfer curve for the fallback WaveShaper. Mapping every input magnitude to at
 * most `ceiling` keeps the degraded path bounded; WaveShaper clamps out-of-range input to the
 * curve endpoints, so |x| > 1 also lands on the ceiling instead of passing through.
 */
export function createCeilingClipCurve(ceiling: number, length = 1024): Float32Array<ArrayBuffer> {
  const bound = Math.min(1, Math.max(0, Number.isFinite(ceiling) ? ceiling : 1))
  const size = Math.max(2, Math.floor(length))
  const curve = new Float32Array(size)
  for (let index = 0; index < size; index += 1) {
    const input = (index / (size - 1)) * 2 - 1
    curve[index] = Math.min(bound, Math.max(-bound, input))
  }
  return curve
}

export interface PeakLimiterOptions {
  sampleRate: number
  ceilingDb?: number
  releaseMs?: number
  lookaheadMs?: number
}

export interface PeakLimiterReport {
  gainReductionDb: number
  maxGainReductionDb: number
  outputPeak: number
  sanitizedSamples: number
  latencySamples: number
  latencyMs: number
}

/**
 * Stereo-linked lookahead sample-peak limiter. Pure TypeScript with only preallocated buffers.
 *
 * Behavior:
 * - Stereo link: one gain is derived from max(|L|, |R|) and applied to both channels, so the
 *   stereo image and inter-channel balance are preserved.
 * - Attack: the sliding minimum of the required gain over the lookahead window is applied
 *   immediately, so the gain is already reduced before an overload reaches the output. There is
 *   no soft attack stage, therefore the ceiling cannot be overshot.
 * - Release: one-pole recovery toward unity with time constant `releaseMs`, clamped by the same
 *   sliding minimum so recovery never re-exposes an overload.
 * - Latency: exactly `lookaheadMs` of preallocated delay, reported in samples and milliseconds.
 * - Faults: non-finite input samples are replaced with silence and counted.
 */
export class PeakLimiter {
  readonly sampleRate: number
  readonly latencySamples: number

  private readonly windowSize: number
  private readonly delayCapacity: number
  private readonly dequeCapacity: number
  private readonly delayLeft: Float32Array
  private readonly delayRight: Float32Array
  private readonly requiredGain: Float32Array
  private readonly deque: Float64Array

  private dequeHead = 0
  private dequeTail = 0
  private sampleIndex = 0
  private writeIndex = 0

  private targetCeilingLinear: number
  private smoothedCeilingLinear: number
  private ceilingCoefficient: number
  private releaseCoefficient: number
  private targetReleaseMs: number
  private smoothedGain = 1

  private reportMinGain = 1
  private overallMinGain = 1
  private reportOutputPeak = 0
  private sanitizedSamples = 0

  constructor(options: PeakLimiterOptions) {
    const rate = Number.isFinite(options.sampleRate) && options.sampleRate > 0 ? options.sampleRate : 48000
    this.sampleRate = rate
    this.targetCeilingLinear = decibelsToGain(clampLimiterCeilingDb(options.ceilingDb ?? DEFAULT_LIMITER_CEILING_DB))
    this.smoothedCeilingLinear = this.targetCeilingLinear
    this.targetReleaseMs = clampLimiterReleaseMs(options.releaseMs ?? DEFAULT_LIMITER_RELEASE_MS)
    this.releaseCoefficient = PeakLimiter.releaseCoefficientFor(this.targetReleaseMs, rate)
    this.ceilingCoefficient = PeakLimiter.releaseCoefficientFor(LIMITER_CEILING_SMOOTHING_MS, rate)

    this.latencySamples = lookaheadMsToSamples(options.lookaheadMs ?? DEFAULT_LIMITER_LOOKAHEAD_MS, rate)
    this.windowSize = this.latencySamples + 1
    this.delayCapacity = Math.max(1, this.latencySamples)
    this.dequeCapacity = this.windowSize + 1
    this.delayLeft = new Float32Array(this.delayCapacity)
    this.delayRight = new Float32Array(this.delayCapacity)
    this.requiredGain = new Float32Array(this.windowSize)
    this.requiredGain.fill(1)
    this.deque = new Float64Array(this.dequeCapacity)
  }

  private static releaseCoefficientFor(milliseconds: number, sampleRate: number): number {
    const samples = Math.max(1, (milliseconds / 1000) * sampleRate)
    return 1 - Math.exp(-1 / samples)
  }

  getLatencySeconds(): number {
    return this.latencySamples / this.sampleRate
  }

  getCeilingDb(): number {
    return gainToDecibels(this.targetCeilingLinear)
  }

  /** Raising the ceiling ramps up over 20 ms; lowering it applies instantly to stay bounded. */
  setCeilingDb(decibels: number): void {
    this.targetCeilingLinear = decibelsToGain(clampLimiterCeilingDb(decibels))
    if (this.targetCeilingLinear < this.smoothedCeilingLinear) {
      this.smoothedCeilingLinear = this.targetCeilingLinear
    }
  }

  getReleaseMs(): number {
    return this.targetReleaseMs
  }

  setReleaseMs(milliseconds: number): void {
    this.targetReleaseMs = clampLimiterReleaseMs(milliseconds)
    this.releaseCoefficient = PeakLimiter.releaseCoefficientFor(this.targetReleaseMs, this.sampleRate)
  }

  reset(): void {
    this.delayLeft.fill(0)
    this.delayRight.fill(0)
    this.requiredGain.fill(1)
    this.dequeHead = 0
    this.dequeTail = 0
    this.sampleIndex = 0
    this.writeIndex = 0
    this.smoothedGain = 1
    this.smoothedCeilingLinear = this.targetCeilingLinear
    this.resetReport()
    this.overallMinGain = 1
    this.sanitizedSamples = 0
  }

  resetReport(): void {
    this.reportMinGain = 1
    this.reportOutputPeak = 0
  }

  getReport(): PeakLimiterReport {
    return {
      gainReductionDb: Math.max(0, -gainToDecibels(this.reportMinGain)),
      maxGainReductionDb: Math.max(0, -gainToDecibels(this.overallMinGain)),
      outputPeak: this.reportOutputPeak,
      sanitizedSamples: this.sanitizedSamples,
      latencySamples: this.latencySamples,
      latencyMs: this.getLatencySeconds() * 1000
    }
  }

  process(
    left: Float32Array | undefined,
    right: Float32Array | undefined,
    outLeft: Float32Array,
    outRight: Float32Array | undefined,
    frameCount = outLeft.length
  ): void {
    const outR = outRight ?? outLeft
    const inputRight = right ?? left
    const isMonoOutput = outR === outLeft
    const delay = this.latencySamples

    for (let frame = 0; frame < frameCount; frame += 1) {
      let inLeft = left?.[frame] ?? 0
      let inRight = inputRight?.[frame] ?? 0
      if (!Number.isFinite(inLeft)) {
        inLeft = 0
        this.sanitizedSamples += 1
      }
      if (!Number.isFinite(inRight)) {
        inRight = 0
        this.sanitizedSamples += 1
      }

      const target = this.targetCeilingLinear
      if (target < this.smoothedCeilingLinear) {
        this.smoothedCeilingLinear = target
      } else {
        this.smoothedCeilingLinear += (target - this.smoothedCeilingLinear) * this.ceilingCoefficient
      }
      const ceiling = this.smoothedCeilingLinear

      const peak = Math.max(Math.abs(inLeft), Math.abs(inRight))
      const required = peak > ceiling ? ceiling / peak : 1

      const index = this.sampleIndex
      const slot = index % this.windowSize
      this.requiredGain[slot] = required
      while (
        this.dequeTail > this.dequeHead &&
        this.requiredGain[this.deque[(this.dequeTail - 1) % this.dequeCapacity] % this.windowSize] >= required
      ) {
        this.dequeTail -= 1
      }
      this.deque[this.dequeTail % this.dequeCapacity] = index
      this.dequeTail += 1
      while (this.deque[this.dequeHead % this.dequeCapacity] < index - delay) {
        this.dequeHead += 1
      }
      const windowMinimum = this.requiredGain[this.deque[this.dequeHead % this.dequeCapacity] % this.windowSize]

      if (windowMinimum < this.smoothedGain) {
        this.smoothedGain = windowMinimum
      } else {
        this.smoothedGain = Math.min(
          windowMinimum,
          this.smoothedGain + (1 - this.smoothedGain) * this.releaseCoefficient
        )
      }

      let delayedLeft = inLeft
      let delayedRight = inRight
      if (delay > 0) {
        delayedLeft = this.delayLeft[this.writeIndex]
        delayedRight = this.delayRight[this.writeIndex]
        this.delayLeft[this.writeIndex] = inLeft
        this.delayRight[this.writeIndex] = inRight
        this.writeIndex = (this.writeIndex + 1) % this.delayCapacity
      }

      let outSampleLeft = delayedLeft * this.smoothedGain
      let outSampleRight = delayedRight * this.smoothedGain
      if (!Number.isFinite(outSampleLeft)) {
        outSampleLeft = 0
        this.sanitizedSamples += 1
      }
      if (!Number.isFinite(outSampleRight)) {
        outSampleRight = 0
        this.sanitizedSamples += 1
      }

      outLeft[frame] = outSampleLeft
      if (!isMonoOutput) outR[frame] = outSampleRight

      const magnitude = Math.max(Math.abs(outSampleLeft), Math.abs(outSampleRight))
      if (magnitude > this.reportOutputPeak) this.reportOutputPeak = magnitude
      if (this.smoothedGain < this.reportMinGain) this.reportMinGain = this.smoothedGain
      if (this.smoothedGain < this.overallMinGain) this.overallMinGain = this.smoothedGain
      this.sampleIndex += 1
    }
  }
}
