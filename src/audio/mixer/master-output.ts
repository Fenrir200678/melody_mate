import * as Tone from 'tone'
import limiterProcessorUrl from '../worklets/limiter-processor.ts?worker&url'
import {
  LIMITER_PROCESSOR_NAME,
  type LimiterInboundMessage,
  type LimiterTelemetryMessage
} from '../worklets/limiter-message'
import type { StereoMeterReading } from '../../core/audio-analysis/stereo-metering'
import type { WorkletNodeFactory } from './metering'
import { decibelsToGain } from '../../core/audio/gain-staging'
import {
  clampLimiterCeilingDb,
  clampLimiterLookaheadMs,
  clampLimiterReleaseMs,
  createCeilingClipCurve,
  DEFAULT_LIMITER_CEILING_DB,
  DEFAULT_LIMITER_LOOKAHEAD_MS,
  DEFAULT_LIMITER_RELEASE_MS,
  FALLBACK_PROTECTION_GAIN,
  lookaheadMsToSamples
} from '../../core/audio-dsp/peak-limiter'

export type OutputProtectionStatus = 'idle' | 'loading' | 'active' | 'fallback' | 'failed'

export interface MasterOutputOptions {
  ceilingDb?: number
  releaseMs?: number
  lookaheadMs?: number
}

export interface OutputProtectionSnapshot {
  status: OutputProtectionStatus
  error: string | null
  ceilingDb: number
  latencySamples: number
  latencyMs: number
  gainReductionDb: number
  maxGainReductionDb: number
  sanitizedSamples: number
  postProtection: StereoMeterReading | null
}

/**
 * Final, always-on stereo output protection. This is the last processing stage before the
 * single destination; only unity or attenuating stages may follow it.
 *
 * When the limiter worklet loads, the node delay line provides `lookaheadMs` of latency and the
 * telemetry carries gain reduction and post-protection peaks. If the worklet cannot load, the
 * stage switches to a flagged degraded fallback (fixed attenuation plus a hard ceiling clip) so
 * the output stays bounded instead of silently running unprotected.
 */
export class MasterOutput {
  readonly input: Tone.Gain
  readonly output: Tone.Gain

  private readonly ceilingDb: number
  private readonly lookaheadMs: number
  private releaseMs: number

  private status: OutputProtectionStatus = 'idle'
  private error: string | null = null
  private limiterNode: AudioWorkletNode | null = null
  private fallbackGain: GainNode | null = null
  private fallbackClip: WaveShaperNode | null = null

  private latencySamples = 0
  private sampleRate = 0
  private gainReductionDb = 0
  private maxGainReductionDb = 0
  private sanitizedSamples = 0
  private postProtection: StereoMeterReading | null = null

  constructor(options: MasterOutputOptions = {}) {
    this.input = new Tone.Gain(1)
    this.output = new Tone.Gain(1)
    this.input.connect(this.output)
    this.ceilingDb = clampLimiterCeilingDb(options.ceilingDb ?? DEFAULT_LIMITER_CEILING_DB)
    this.releaseMs = clampLimiterReleaseMs(options.releaseMs ?? DEFAULT_LIMITER_RELEASE_MS)
    this.lookaheadMs = clampLimiterLookaheadMs(options.lookaheadMs ?? DEFAULT_LIMITER_LOOKAHEAD_MS)
  }

  async initialize(context: BaseAudioContext, createNode?: WorkletNodeFactory): Promise<boolean> {
    if (this.status === 'active') return true
    this.status = 'loading'
    this.error = null
    this.sampleRate = Number.isFinite(context.sampleRate) && context.sampleRate > 0 ? context.sampleRate : 0
    this.latencySamples = lookaheadMsToSamples(this.lookaheadMs, context.sampleRate)

    try {
      const worklet = (context as BaseAudioContext & { audioWorklet?: AudioWorklet }).audioWorklet
      if (!worklet) throw new Error('AudioWorklet is not available in this audio context.')
      await worklet.addModule(limiterProcessorUrl)

      const nodeOptions: AudioWorkletNodeOptions = {
        channelCount: 2,
        channelCountMode: 'explicit',
        channelInterpretation: 'speakers',
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2]
      }
      const node = createNode
        ? createNode(LIMITER_PROCESSOR_NAME, nodeOptions)
        : new AudioWorkletNode(context, LIMITER_PROCESSOR_NAME, nodeOptions)
      node.port.onmessage = (event: MessageEvent<LimiterTelemetryMessage>) => this.handleMessage(event.data)
      const config: LimiterInboundMessage = {
        type: 'config',
        ceilingDb: this.ceilingDb,
        releaseMs: this.releaseMs
      }
      node.port.postMessage(config)

      this.input.disconnect(this.output)
      this.input.connect(node as unknown as Tone.ToneAudioNode)
      node.connect(this.output.input as unknown as AudioNode)

      this.limiterNode = node
      this.status = 'active'
      return true
    } catch (cause) {
      this.enableFallback(context, cause)
      return false
    }
  }

  isActive(): boolean {
    return this.status === 'active'
  }

  getStatus(): OutputProtectionStatus {
    return this.status
  }

  getError(): string | null {
    return this.error
  }

  getCeilingDb(): number {
    return this.ceilingDb
  }

  setReleaseMs(milliseconds: number): void {
    this.releaseMs = clampLimiterReleaseMs(milliseconds)
    if (this.limiterNode) {
      const config: LimiterInboundMessage = {
        type: 'config',
        ceilingDb: this.ceilingDb,
        releaseMs: this.releaseMs
      }
      this.limiterNode.port.postMessage(config)
    }
  }

  getLatencySeconds(): number {
    if (!this.latencySamples || this.sampleRate <= 0) return 0
    return this.latencySamples / this.sampleRate
  }

  getGainReductionDb(): number {
    return this.gainReductionDb
  }

  getSnapshot(): OutputProtectionSnapshot {
    return {
      status: this.status,
      error: this.error,
      ceilingDb: this.ceilingDb,
      latencySamples: this.latencySamples,
      latencyMs: this.sampleRate > 0 ? (this.latencySamples / this.sampleRate) * 1000 : 0,
      gainReductionDb: this.gainReductionDb,
      maxGainReductionDb: this.maxGainReductionDb,
      sanitizedSamples: this.sanitizedSamples,
      postProtection: this.postProtection
    }
  }

  resetTelemetry(): void {
    this.gainReductionDb = 0
    this.maxGainReductionDb = 0
    this.sanitizedSamples = 0
    this.postProtection = null
  }

  private enableFallback(context: BaseAudioContext, cause: unknown): void {
    const reason = cause instanceof Error ? cause.message : String(cause)
    try {
      this.input.disconnect()
    } catch {
      // Already disconnected or empty.
    }

    try {
      const gain = context.createGain()
      gain.gain.value = FALLBACK_PROTECTION_GAIN
      const clip = context.createWaveShaper()
      clip.curve = createCeilingClipCurve(decibelsToGain(this.ceilingDb))
      clip.oversample = 'none'

      this.input.connect(gain as unknown as Tone.ToneAudioNode)
      gain.connect(clip)
      clip.connect(this.output.input as unknown as AudioNode)

      this.fallbackGain = gain
      this.fallbackClip = clip
      this.latencySamples = 0
      this.status = 'fallback'
      this.error = reason
    } catch (fallbackCause) {
      // Only reachable with an unusable audio context; keep the fault visible and never silent.
      this.status = 'failed'
      this.error = `${reason} Fallback protection unavailable: ${
        fallbackCause instanceof Error ? fallbackCause.message : String(fallbackCause)
      }`
    }
  }

  private handleMessage(message: LimiterTelemetryMessage): void {
    if (message?.type !== 'telemetry') return
    this.gainReductionDb = message.gainReductionDb
    this.maxGainReductionDb = Math.max(this.maxGainReductionDb, message.maxGainReductionDb)
    this.sanitizedSamples = message.sanitizedSamples
    this.latencySamples = message.latencySamples
    this.postProtection = message.postProtection
  }

  dispose(): void {
    this.input.dispose()
    this.output.dispose()
    if (this.limiterNode) {
      this.limiterNode.port.onmessage = null
      this.limiterNode.disconnect()
      this.limiterNode = null
    }
    this.fallbackGain?.disconnect()
    this.fallbackGain = null
    this.fallbackClip?.disconnect()
    this.fallbackClip = null
  }
}
