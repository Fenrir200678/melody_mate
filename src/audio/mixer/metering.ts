import type { StereoMeterReading } from '../../core/audio-analysis/stereo-metering'
import meterProcessorUrl from '../worklets/meter-processor.ts?worker&url'

export interface MasterMeterReadings {
  preMaster: StereoMeterReading | null
  postMaster: StereoMeterReading | null
  postProtection: StereoMeterReading | null
  gainReductionDb: number | null
}

/**
 * Tone wraps its raw context with `standardized-audio-context`, which is not an instance of the
 * native `BaseAudioContext`. Nodes therefore must be created through Tone's context-aware
 * factory; a native `new AudioWorkletNode(rawContext)` is rejected with a TypeError.
 */
export type WorkletNodeFactory = (name: string, options: AudioWorkletNodeOptions) => AudioWorkletNode

const EMPTY_READINGS: MasterMeterReadings = {
  preMaster: null,
  postMaster: null,
  postProtection: null,
  gainReductionDb: null
}

export class MasterMetering {
  private readings: MasterMeterReadings = EMPTY_READINGS

  getReadings(): MasterMeterReadings {
    return this.readings
  }

  update(stage: 'preMaster' | 'postMaster', reading: StereoMeterReading): void {
    this.readings = { ...this.readings, [stage]: reading }
  }

  reset(): void {
    this.readings = EMPTY_READINGS
  }
}

export async function createPassThroughMeter(
  context: BaseAudioContext,
  onReading: (reading: StereoMeterReading) => void,
  createNode: WorkletNodeFactory
): Promise<AudioWorkletNode> {
  await context.audioWorklet.addModule(meterProcessorUrl)
  const meter = createNode('melodymate-stereo-meter', {
    channelCount: 2,
    channelCountMode: 'explicit',
    channelInterpretation: 'speakers',
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [2]
  })
  meter.port.onmessage = (event: MessageEvent<StereoMeterReading>) => onReading(event.data)
  return meter
}
