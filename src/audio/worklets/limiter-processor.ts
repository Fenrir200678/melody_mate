import {
  accumulateStereoSamples,
  createStereoMeterMeasurements,
  toStereoMeterReading
} from '../../core/audio-analysis/stereo-metering'
import { PeakLimiter } from '../../core/audio-dsp/peak-limiter'
import { LIMITER_PROCESSOR_NAME, type LimiterInboundMessage, type LimiterTelemetryMessage } from './limiter-message'

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort
}

declare function registerProcessor(name: string, processor: typeof AudioWorkletProcessor): void
declare const sampleRate: number

class PeakLimiterProcessor extends AudioWorkletProcessor {
  private limiter = new PeakLimiter({ sampleRate })
  private measurements = createStereoMeterMeasurements()
  private framesSinceReport = 0

  constructor() {
    super()
    this.port.onmessage = (event: MessageEvent<LimiterInboundMessage>) => {
      const message = event.data
      if (message?.type === 'config') {
        this.limiter.setCeilingDb(message.ceilingDb)
        this.limiter.setReleaseMs(message.releaseMs)
      }
    }
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const input = inputs[0] ?? []
    const output = outputs[0] ?? []
    const frameCount = output[0]?.length ?? 0
    if (frameCount === 0) return true

    const inputLeft = input[0]?.length ? input[0] : undefined
    const inputRight = input[1]?.length ? input[1] : undefined

    const outputLeft = output[0]
    const outputRight = output[1] ?? outputLeft

    this.limiter.process(inputLeft, inputRight, outputLeft, outputRight, frameCount)
    for (let channel = 2; channel < output.length; channel += 1) output[channel].fill(0)

    accumulateStereoSamples(this.measurements, outputLeft, outputRight)
    this.framesSinceReport += frameCount
    if (this.framesSinceReport >= sampleRate / 25) {
      const report = this.limiter.getReport()
      const message: LimiterTelemetryMessage = {
        type: 'telemetry',
        gainReductionDb: report.gainReductionDb,
        maxGainReductionDb: report.maxGainReductionDb,
        sanitizedSamples: report.sanitizedSamples,
        latencySamples: report.latencySamples,
        postProtection: toStereoMeterReading(this.measurements)
      }
      this.port.postMessage(message)
      this.limiter.resetReport()
      this.measurements = createStereoMeterMeasurements()
      this.framesSinceReport = 0
    }
    return true
  }
}

registerProcessor(LIMITER_PROCESSOR_NAME, PeakLimiterProcessor)
