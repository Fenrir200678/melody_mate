import {
  accumulateStereoSamples,
  createStereoMeterMeasurements,
  toStereoMeterReading
} from '../../core/audio-analysis/stereo-metering'

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort
}

declare function registerProcessor(name: string, processor: typeof AudioWorkletProcessor): void
declare const sampleRate: number

class StereoMeterProcessor extends AudioWorkletProcessor {
  private measurements = createStereoMeterMeasurements()
  private framesSinceReport = 0

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const input = inputs[0] ?? []
    const output = outputs[0] ?? []
    const left = input[0]
    const right = input[1] ?? left

    for (let channel = 0; channel < output.length; channel++) {
      const source = input[channel] ?? input[0]
      if (source) output[channel].set(source)
      else output[channel].fill(0)
    }

    const frameCount = Math.max(left?.length ?? 0, right?.length ?? 0)
    accumulateStereoSamples(this.measurements, left, right)
    this.framesSinceReport += frameCount

    if (this.framesSinceReport >= sampleRate / 25) {
      this.port.postMessage(toStereoMeterReading(this.measurements))
      this.measurements = createStereoMeterMeasurements()
      this.framesSinceReport = 0
    }
    return true
  }
}

registerProcessor('melodymate-stereo-meter', StereoMeterProcessor)
