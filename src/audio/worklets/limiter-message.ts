import type { StereoMeterReading } from '../../core/audio-analysis/stereo-metering'

export const LIMITER_PROCESSOR_NAME = 'melodymate-peak-limiter'

export interface LimiterConfigMessage {
  type: 'config'
  ceilingDb: number
  releaseMs: number
}

export type LimiterInboundMessage = LimiterConfigMessage

export interface LimiterTelemetryMessage {
  type: 'telemetry'
  gainReductionDb: number
  maxGainReductionDb: number
  sanitizedSamples: number
  latencySamples: number
  postProtection: StereoMeterReading
}
