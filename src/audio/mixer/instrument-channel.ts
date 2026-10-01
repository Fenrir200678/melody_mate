import * as Tone from 'tone'
import { clampEffectSendGain } from '../../core/audio/gain-staging'
import {
  MAX_FILTER_CUTOFF_HZ,
  MAX_FILTER_RESONANCE,
  MIN_FILTER_CUTOFF_HZ,
  MIN_FILTER_RESONANCE,
  PARAM_RAMP_SECONDS
} from './constants'

/** A send that taps the channel's post-filter signal and feeds one shared FX return. */
export interface ChannelSendDefinition<SendId extends string> {
  id: SendId
  amount: number
  destination: Tone.ToneAudioNode
}

export interface InstrumentChannelConfig<SendId extends string> {
  /** Initial fader value; `ChannelMixControls` owns the authoritative volume afterwards. */
  initialGain: number
  filter: { cutoff: number; resonance: number }
  /** The lead inserts a resonance-compensation gain between filter and bus. */
  resonanceCompensation: boolean
  sends: readonly ChannelSendDefinition<SendId>[]
  bus: Tone.ToneAudioNode
}

interface ChannelSendNodes {
  gain: Tone.Gain
  amount: number
}

/**
 * Input strip of one instrument: `input -> voiceKill -> gain -> filter -> bus`, with the
 * sound-shaping filter also feeding the channel's FX sends.
 */
export class InstrumentChannel<SendId extends string> {
  readonly input: Tone.Gain
  readonly voiceKill: Tone.Gain

  private readonly gain: Tone.Gain
  private readonly filter: Tone.Filter
  private readonly compensationGain: Tone.Gain | null
  /** Node feeding bus and sends; the lead routes through its compensation gain first. */
  private readonly filterOutput: Tone.ToneAudioNode
  private readonly sends = new Map<SendId, ChannelSendNodes>()

  private cutoff: number
  private resonance: number

  constructor(config: InstrumentChannelConfig<SendId>) {
    this.cutoff = config.filter.cutoff
    this.resonance = config.filter.resonance

    this.voiceKill = new Tone.Gain(1.0)
    this.input = new Tone.Gain(1.0)
    this.gain = new Tone.Gain(config.initialGain)

    this.filter = new Tone.Filter({
      frequency: config.filter.cutoff,
      type: 'lowpass',
      rolloff: -24,
      Q: config.filter.resonance
    })

    this.compensationGain = config.resonanceCompensation ? new Tone.Gain(1.0) : null
    this.filterOutput = this.compensationGain ?? this.filter

    this.input.connect(this.voiceKill)
    this.voiceKill.connect(this.gain)
    this.gain.connect(this.filter)
    if (this.compensationGain) this.filter.connect(this.compensationGain)
    this.filterOutput.connect(config.bus)

    for (const send of config.sends) {
      const sendGain = new Tone.Gain(send.amount)
      this.sends.set(send.id, { gain: sendGain, amount: send.amount })
      this.filterOutput.connect(sendGain)
      sendGain.connect(send.destination)
    }
  }

  setCutoff(hz: number): void {
    const clamped = Math.max(MIN_FILTER_CUTOFF_HZ, Math.min(MAX_FILTER_CUTOFF_HZ, hz))
    this.cutoff = clamped
    this.filter.frequency.rampTo(clamped, PARAM_RAMP_SECONDS)
  }

  getCutoff(): number {
    return this.cutoff
  }

  setResonance(q: number): void {
    const clamped = Math.max(MIN_FILTER_RESONANCE, Math.min(MAX_FILTER_RESONANCE, q))
    this.resonance = clamped
    this.filter.Q.rampTo(clamped, PARAM_RAMP_SECONDS)

    if (this.compensationGain) {
      // Musical resonance gain compensation (prevents explosive resonant peaks from clipping headroom)
      const comp = 1 / Math.sqrt(1 + Math.max(0, clamped - 1) * 0.45)
      this.compensationGain.gain.rampTo(Math.max(0.25, Math.min(1.0, comp)), PARAM_RAMP_SECONDS)
    }
  }

  getResonance(): number {
    return this.resonance
  }

  setSend(id: SendId, amount: number): void {
    const send = this.sends.get(id)
    if (!send) return
    const clamped = clampEffectSendGain(amount)
    send.amount = clamped
    send.gain.gain.rampTo(clamped, PARAM_RAMP_SECONDS)
  }

  getSend(id: SendId): number {
    return this.sends.get(id)?.amount ?? 0
  }

  /** Ramps the fader to an already clamped, audibility-aware target. */
  setGain(target: number): void {
    this.gain.gain.rampTo(target, PARAM_RAMP_SECONDS)
  }

  dispose(): void {
    this.input.dispose()
    this.voiceKill.dispose()
    this.gain.dispose()
    this.filter.dispose()
    this.compensationGain?.dispose()
    for (const send of this.sends.values()) send.gain.dispose()
  }
}
