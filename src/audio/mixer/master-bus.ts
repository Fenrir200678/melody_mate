import * as Tone from 'tone'
import { MasterOutput, type OutputProtectionSnapshot } from './master-output'
import type { MasterMeterReadings } from './metering'
import type { StereoMeterReading } from '../../core/audio-analysis/stereo-metering'
import { now as audioNow } from '../transport-adapter'
import { COMPRESSOR_CROSSFADE_SECONDS, PARAM_RAMP_SECONDS } from './constants'
import { MasterMeteringTap } from './metering-tap'
import { createWorkletNode } from './worklet-node'

/**
 * Master section of the rack.
 *
 * Signal flow: `input (mix bus) -> masterGain -> [busCompressor -> wet | dry] -> postMasterOutput
 * -> masterOutput (final sample-peak protection) -> masterMeter -> destination`.
 *
 * The creative bus compressor is a sound-shaping stage only; the always-on `masterOutput`
 * protection stays engaged whether the compressor is active or bypassed.
 */
export class MasterBus {
  /** Sum point every channel and FX return feeds. */
  readonly input: Tone.Gain

  private readonly preMasterOutput: Tone.Gain
  private readonly masterGain: Tone.Gain
  private readonly busCompressor: Tone.Limiter
  private readonly compressorWetGain: Tone.Gain
  private readonly compressorDryGain: Tone.Gain
  private readonly postMasterOutput: Tone.Gain
  private readonly masterOutput: MasterOutput
  private readonly masterMeter: Tone.Meter
  private readonly metering = new MasterMeteringTap()

  private volume: number
  private isCompressorActive = true

  constructor(initialVolume: number) {
    this.volume = initialVolume

    this.input = new Tone.Gain(1.0)
    this.preMasterOutput = new Tone.Gain(1.0)
    this.masterGain = new Tone.Gain(initialVolume)
    this.busCompressor = new Tone.Limiter(-0.5)
    this.compressorWetGain = new Tone.Gain(1.0)
    this.compressorDryGain = new Tone.Gain(0.0)
    this.postMasterOutput = new Tone.Gain(1.0)
    this.masterOutput = new MasterOutput()
    this.masterMeter = new Tone.Meter({ smoothing: 0.8 })

    this.setupRouting()
  }

  setVolume(gain: number): void {
    const clamped = Math.max(0, Math.min(1, gain))
    this.volume = clamped
    this.masterGain.gain.rampTo(clamped, PARAM_RAMP_SECONDS)
  }

  getVolume(): number {
    return this.volume
  }

  /**
   * Enables or bypasses the optional creative bus compressor by crossfading the wet and dry
   * branches of the master chain.
   */
  setCompressorActive(active: boolean): void {
    this.isCompressorActive = active
    const now = audioNow()
    const route = (wet: Tone.Gain, wetTarget: number, dry: Tone.Gain, dryTarget: number) => {
      wet.gain.cancelScheduledValues(now)
      wet.gain.setValueAtTime(wet.gain.getValueAtTime(now), now)
      wet.gain.linearRampToValueAtTime(wetTarget, now + COMPRESSOR_CROSSFADE_SECONDS)
      dry.gain.cancelScheduledValues(now)
      dry.gain.setValueAtTime(dry.gain.getValueAtTime(now), now)
      dry.gain.linearRampToValueAtTime(dryTarget, now + COMPRESSOR_CROSSFADE_SECONDS)
    }

    if (active) {
      route(this.compressorWetGain, 1.0, this.compressorDryGain, 0.0)
    } else {
      route(this.compressorWetGain, 0.0, this.compressorDryGain, 1.0)
    }
  }

  isCompressorEnabled(): boolean {
    return this.isCompressorActive
  }

  async initializeMetering(): Promise<boolean> {
    return this.metering.initialize(() => ({
      preMaster: {
        source: this.preMasterOutput,
        destination: this.masterGain,
        destinationInput: () => this.masterGain.input as unknown as AudioNode
      },
      postMaster: {
        source: this.postMasterOutput,
        destination: this.masterOutput.input,
        destinationInput: () => this.masterOutput.input.input as unknown as AudioNode
      }
    }))
  }

  getMeteringError(): string | null {
    return this.metering.getError()
  }

  /**
   * Loads the always-on final output protection. Returns false and keeps a visibly flagged
   * degraded fallback when the worklet cannot be installed.
   */
  async initializeOutputProtection(): Promise<boolean> {
    const context = Tone.getContext().rawContext
    if (!context) return false
    return this.masterOutput.initialize(context as BaseAudioContext, createWorkletNode)
  }

  getProtectionSnapshot(): OutputProtectionSnapshot {
    return this.masterOutput.getSnapshot()
  }

  getLatencySeconds(): number {
    return this.masterOutput.getLatencySeconds()
  }

  getLevel(): number {
    return this.getMeterReadings().postMaster?.leftRmsDb ?? -Infinity
  }

  getMeterReadings(): MasterMeterReadings {
    const workletReadings = this.metering.getReadings()
    const postMaster = workletReadings.postMaster ?? this.getLegacyPostMasterReading()
    const protection = this.masterOutput.getSnapshot()
    return {
      preMaster: workletReadings.preMaster,
      postMaster,
      postProtection: protection.postProtection,
      gainReductionDb: protection.status === 'active' ? protection.gainReductionDb : null
    }
  }

  getLegacyMasterRmsLevel(): number {
    const val = this.masterMeter.getValue()
    if (Array.isArray(val)) {
      return val[0] ?? -Infinity
    }
    return typeof val === 'number' ? val : -Infinity
  }

  dispose(): void {
    this.input.dispose()
    this.preMasterOutput.dispose()
    this.masterGain.dispose()
    this.busCompressor.dispose()
    this.compressorWetGain.dispose()
    this.compressorDryGain.dispose()
    this.postMasterOutput.dispose()
    this.masterOutput.dispose()
    this.masterMeter.dispose()
    this.metering.dispose()
  }

  private setupRouting(): void {
    this.input.connect(this.preMasterOutput)
    this.preMasterOutput.connect(this.masterGain)

    // Creative bus compressor path (Wet)
    this.masterGain.connect(this.busCompressor)
    this.busCompressor.connect(this.compressorWetGain)
    this.compressorWetGain.connect(this.postMasterOutput)

    // Creative bus compressor bypass path (Dry)
    this.masterGain.connect(this.compressorDryGain)
    this.compressorDryGain.connect(this.postMasterOutput)

    this.postMasterOutput.connect(this.masterOutput.input)
    this.masterOutput.output.connect(this.masterMeter)
    this.masterMeter.toDestination()
  }

  private getLegacyPostMasterReading(): StereoMeterReading | null {
    const val = this.masterMeter.getValue()
    if (val === undefined) return null
    const rms = Array.isArray(val) ? val : [val, val]
    return {
      leftPeakDb: -Infinity,
      rightPeakDb: -Infinity,
      leftRmsDb: rms[0] ?? -Infinity,
      rightRmsDb: rms[1] ?? -Infinity,
      overloadSamples: 0,
      nonFiniteSamples: 0,
      frames: 0
    }
  }
}
