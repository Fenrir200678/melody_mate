import { decibelsToGain } from '../../core/audio/gain-staging'
import type { NativeSynthPatch } from '../../core/synth/patch'

export interface InsertEffectsConfig {
  drive: number
  driveBypass?: boolean
  chorus: number
  chorusBypass?: boolean
  reverb?: number
  reverbBypass?: boolean
}

function createSaturationCurve(points = 2049): Float32Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(points * Float32Array.BYTES_PER_ELEMENT)
  const curve = new Float32Array(buffer)
  const norm = Math.tanh(2.5)
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * 2 - 1
    curve[i] = Math.tanh(x * 2.5) / norm
  }
  return curve
}

function createReverbImpulse(context: BaseAudioContext, durationSeconds = 2.2, decayRate = 2.4): AudioBuffer | null {
  if (typeof context.createBuffer !== 'function') return null
  const sampleRate = context.sampleRate || 44100
  const length = Math.floor(sampleRate * durationSeconds)
  try {
    const impulse = context.createBuffer(2, length, sampleRate)
    const left = impulse.getChannelData(0)
    const right = impulse.getChannelData(1)
    for (let i = 0; i < length; i++) {
      const t = i / length
      const envelope = Math.exp(-t * decayRate * 3.5)
      left[i] = (Math.random() * 2 - 1) * envelope
      right[i] = (Math.random() * 2 - 1) * envelope
    }
    return impulse
  } catch {
    return null
  }
}

/**
 * Patch-owned instrument insert effects chain:
 * Voice Sum -> Compensated Saturation (4x oversampled) -> Stereo Chorus -> Studio Reverb -> Output Trim -> Output.
 *
 * Designed with smooth parameter automation, anti-aliased nonlinear shaping, and mono fold-down protection.
 */
export class InstrumentInsertEffects {
  readonly input: GainNode
  readonly output: GainNode

  private readonly context: BaseAudioContext
  private readonly nodes: AudioNode[] = []
  private readonly sources: AudioScheduledSourceNode[] = []

  // Saturation nodes
  private satPreGain: GainNode | null = null
  private satShaper: WaveShaperNode | null = null
  private satCompGain: GainNode | null = null
  private satWetGain: GainNode | null = null
  private satDryGain: GainNode | null = null
  private satSum: GainNode | null = null

  // Chorus nodes
  private chorusHpFilter: BiquadFilterNode | null = null
  private delayLeft: DelayNode | null = null
  private delayRight: DelayNode | null = null
  private chorusLfo: OscillatorNode | null = null
  private modLeftGain: GainNode | null = null
  private modRightGain: GainNode | null = null
  private chorusMerger: ChannelMergerNode | null = null
  private chorusWetGain: GainNode | null = null
  private chorusDryGain: GainNode | null = null
  private chorusSum: GainNode | null = null

  // Reverb nodes
  private reverbHpFilter: BiquadFilterNode | null = null
  private reverbLpFilter: BiquadFilterNode | null = null
  private reverbConvolver: ConvolverNode | null = null
  private reverbWetGain: GainNode | null = null
  private reverbDryGain: GainNode | null = null
  private reverbSum: GainNode | null = null

  // Output trim node
  private readonly trimGain: GainNode

  private currentDrive = 0
  private currentDriveBypass = false
  private currentChorus = 0
  private currentChorusBypass = false
  private currentReverb = 0
  private currentReverbBypass = false
  private currentOutputTrimDb = -12
  private disposed = false

  constructor(context: BaseAudioContext, inserts: InsertEffectsConfig, outputTrimDb = -12) {
    this.context = context
    this.input = context.createGain()
    this.output = context.createGain()
    this.trimGain = context.createGain()
    if (this.trimGain?.gain) {
      this.trimGain.gain.value = decibelsToGain(outputTrimDb)
    }
    this.nodes.push(this.input, this.output, this.trimGain)

    this.currentDrive = inserts.drive
    this.currentDriveBypass = inserts.driveBypass ?? false
    this.currentChorus = inserts.chorus
    this.currentChorusBypass = inserts.chorusBypass ?? false
    this.currentReverb = inserts.reverb ?? 0
    this.currentReverbBypass = inserts.reverbBypass ?? false
    this.currentOutputTrimDb = outputTrimDb

    this.buildGraph()
    this.applyDrive(this.currentDrive, this.currentDriveBypass, 0)
    this.applyChorus(this.currentChorus, this.currentChorusBypass, 0)
    this.applyReverb(this.currentReverb, this.currentReverbBypass, 0)
  }

  private buildGraph(): void {
    const ctx = this.context
    // Support minimal mock contexts in unit tests
    const canWaveShape = typeof ctx.createWaveShaper === 'function'
    const canDelay = typeof ctx.createDelay === 'function'

    let stageOutput: AudioNode = this.input

    if (canWaveShape) {
      // Saturation stage
      this.satPreGain = ctx.createGain()
      this.satShaper = ctx.createWaveShaper()
      if (this.satShaper) {
        this.satShaper.oversample = '4x'
        this.satShaper.curve = createSaturationCurve()
      }
      this.satCompGain = ctx.createGain()
      this.satWetGain = ctx.createGain()
      this.satDryGain = ctx.createGain()
      this.satSum = ctx.createGain()

      // Dry path
      this.input.connect(this.satDryGain)
      this.satDryGain.connect(this.satSum)

      // Wet path: input -> preGain -> waveShaper -> compGain -> wetGain -> satSum
      this.input.connect(this.satPreGain)
      this.satPreGain.connect(this.satShaper)
      this.satShaper.connect(this.satCompGain)
      this.satCompGain.connect(this.satWetGain)
      this.satWetGain.connect(this.satSum)

      this.nodes.push(this.satPreGain, this.satShaper, this.satCompGain, this.satWetGain, this.satDryGain, this.satSum)
      stageOutput = this.satSum
    }

    if (canDelay && typeof ctx.createChannelMerger === 'function') {
      // Stereo Chorus stage
      this.chorusHpFilter = ctx.createBiquadFilter()
      if (this.chorusHpFilter) {
        this.chorusHpFilter.type = 'highpass'
        if (this.chorusHpFilter.frequency) this.chorusHpFilter.frequency.value = 120
      }

      this.delayLeft = ctx.createDelay(0.05)
      if (this.delayLeft?.delayTime) this.delayLeft.delayTime.value = 0.0055 // 5.5 ms nominal delay
      this.delayRight = ctx.createDelay(0.05)
      if (this.delayRight?.delayTime) this.delayRight.delayTime.value = 0.0075 // 7.5 ms nominal delay

      this.chorusLfo = ctx.createOscillator()
      if (this.chorusLfo) {
        this.chorusLfo.type = 'sine'
        if (this.chorusLfo.frequency) this.chorusLfo.frequency.value = 1.25 // 1.25 Hz modulation
      }

      this.modLeftGain = ctx.createGain()
      if (this.modLeftGain?.gain) this.modLeftGain.gain.value = 0.0018
      this.modRightGain = ctx.createGain()
      if (this.modRightGain?.gain) this.modRightGain.gain.value = -0.0018 // 180° anti-phase stereo spread

      if (this.chorusLfo && this.modLeftGain && this.modRightGain && this.delayLeft && this.delayRight) {
        this.chorusLfo.connect(this.modLeftGain)
        this.chorusLfo.connect(this.modRightGain)
        if (this.delayLeft.delayTime) this.modLeftGain.connect(this.delayLeft.delayTime)
        if (this.delayRight.delayTime) this.modRightGain.connect(this.delayRight.delayTime)
      }

      this.chorusMerger = ctx.createChannelMerger(2)
      if (this.delayLeft && this.chorusMerger) this.delayLeft.connect(this.chorusMerger, 0, 0)
      if (this.delayRight && this.chorusMerger) this.delayRight.connect(this.chorusMerger, 0, 1)

      this.chorusWetGain = ctx.createGain()
      this.chorusDryGain = ctx.createGain()
      this.chorusSum = ctx.createGain()

      // Dry path
      stageOutput.connect(this.chorusDryGain)
      this.chorusDryGain.connect(this.chorusSum)

      // Wet path
      if (this.chorusHpFilter && this.delayLeft && this.delayRight && this.chorusMerger && this.chorusWetGain) {
        stageOutput.connect(this.chorusHpFilter)
        this.chorusHpFilter.connect(this.delayLeft)
        this.chorusHpFilter.connect(this.delayRight)
        this.chorusMerger.connect(this.chorusWetGain)
        this.chorusWetGain.connect(this.chorusSum)
      }

      try {
        this.chorusLfo?.start?.()
        if (this.chorusLfo) this.sources.push(this.chorusLfo)
      } catch {
        // Mock context might not support start
      }

      this.nodes.push(
        this.chorusHpFilter,
        this.delayLeft,
        this.delayRight,
        this.chorusLfo,
        this.modLeftGain,
        this.modRightGain,
        this.chorusMerger,
        this.chorusWetGain,
        this.chorusDryGain,
        this.chorusSum
      )
      stageOutput = this.chorusSum
    }

    const canConvolve = typeof ctx.createConvolver === 'function'

    if (canConvolve) {
      // Studio Plate/Hall Reverb stage
      this.reverbHpFilter = ctx.createBiquadFilter?.() ?? null
      if (this.reverbHpFilter) {
        this.reverbHpFilter.type = 'highpass'
        if (this.reverbHpFilter.frequency) this.reverbHpFilter.frequency.value = 160
      }

      this.reverbLpFilter = ctx.createBiquadFilter?.() ?? null
      if (this.reverbLpFilter) {
        this.reverbLpFilter.type = 'lowpass'
        if (this.reverbLpFilter.frequency) this.reverbLpFilter.frequency.value = 6500
      }

      this.reverbConvolver = ctx.createConvolver()
      const impulse = createReverbImpulse(ctx)
      if (this.reverbConvolver && impulse) {
        this.reverbConvolver.buffer = impulse
      }

      this.reverbWetGain = ctx.createGain()
      this.reverbDryGain = ctx.createGain()
      this.reverbSum = ctx.createGain()

      // Dry path
      stageOutput.connect(this.reverbDryGain)
      this.reverbDryGain.connect(this.reverbSum)

      // Wet path: stageOutput -> HP (160Hz) -> LP (6.5kHz) -> Convolver -> Wet Gain -> Sum
      if (this.reverbHpFilter && this.reverbLpFilter && this.reverbConvolver && this.reverbWetGain) {
        stageOutput.connect(this.reverbHpFilter)
        this.reverbHpFilter.connect(this.reverbLpFilter)
        this.reverbLpFilter.connect(this.reverbConvolver)
        this.reverbConvolver.connect(this.reverbWetGain)
        this.reverbWetGain.connect(this.reverbSum)
      }

      this.nodes.push(
        this.reverbHpFilter,
        this.reverbLpFilter,
        this.reverbConvolver,
        this.reverbWetGain,
        this.reverbDryGain,
        this.reverbSum
      )
      stageOutput = this.reverbSum
    }

    // Connect final stage to output trim -> output
    stageOutput.connect(this.trimGain)
    this.trimGain.connect(this.output)
  }

  private applyDrive(drive: number, bypass: boolean, time = this.context.currentTime): void {
    if (!this.satPreGain || !this.satCompGain || !this.satWetGain || !this.satDryGain) return
    const isOff = bypass || drive <= 0.001
    const targetDrive = isOff ? 0 : Math.max(0, Math.min(1, drive))

    // Pre-gain: 1x (0 dB) to 7x (+16.9 dB)
    const preGainVal = 1 + targetDrive * 6.0
    // Compensation: attenuates saturated signal to preserve headroom
    const compGainVal = 1 / (1 + targetDrive * 1.4)
    // Crossfade: dry remains solid, wet blends in smoothly
    const wetVal = isOff ? 0 : targetDrive
    const dryVal = isOff ? 1 : 1 - targetDrive * 0.65

    const tc = 0.015
    this.satPreGain.gain?.setTargetAtTime?.(preGainVal, time, tc)
    this.satCompGain.gain?.setTargetAtTime?.(compGainVal, time, tc)
    this.satWetGain.gain?.setTargetAtTime?.(wetVal, time, tc)
    this.satDryGain.gain?.setTargetAtTime?.(dryVal, time, tc)
  }

  private applyChorus(chorus: number, bypass: boolean, time = this.context.currentTime): void {
    if (!this.chorusWetGain || !this.chorusDryGain || !this.modLeftGain || !this.modRightGain) return
    const isOff = bypass || chorus <= 0.001
    const targetChorus = isOff ? 0 : Math.max(0, Math.min(1, chorus))

    const wetVal = isOff ? 0 : targetChorus * 0.8
    const dryVal = isOff ? 1 : 1 - targetChorus * 0.35
    const depthVal = isOff ? 0 : 0.0018 * targetChorus

    const tc = 0.015
    this.chorusWetGain.gain?.setTargetAtTime?.(wetVal, time, tc)
    this.chorusDryGain.gain?.setTargetAtTime?.(dryVal, time, tc)
    this.modLeftGain.gain?.setTargetAtTime?.(depthVal, time, tc)
    this.modRightGain.gain?.setTargetAtTime?.(-depthVal, time, tc)
  }

  private applyReverb(reverb: number, bypass: boolean, time = this.context.currentTime): void {
    if (!this.reverbWetGain || !this.reverbDryGain) return
    const isOff = bypass || reverb <= 0.001
    const targetReverb = isOff ? 0 : Math.max(0, Math.min(1, reverb))

    const wetVal = isOff ? 0 : targetReverb * 0.75
    const dryVal = isOff ? 1 : 1 - targetReverb * 0.3
    const tc = 0.015

    this.reverbWetGain.gain?.setTargetAtTime?.(wetVal, time, tc)
    this.reverbDryGain.gain?.setTargetAtTime?.(dryVal, time, tc)
  }

  setDrive(amount: number, bypass = this.currentDriveBypass, time = this.context.currentTime): void {
    this.currentDrive = Math.max(0, Math.min(1, amount))
    this.currentDriveBypass = bypass
    this.applyDrive(this.currentDrive, this.currentDriveBypass, time)
  }

  setChorus(amount: number, bypass = this.currentChorusBypass, time = this.context.currentTime): void {
    this.currentChorus = Math.max(0, Math.min(1, amount))
    this.currentChorusBypass = bypass
    this.applyChorus(this.currentChorus, this.currentChorusBypass, time)
  }

  setReverb(amount: number, bypass = this.currentReverbBypass, time = this.context.currentTime): void {
    this.currentReverb = Math.max(0, Math.min(1, amount))
    this.currentReverbBypass = bypass
    this.applyReverb(this.currentReverb, this.currentReverbBypass, time)
  }

  setOutputTrim(trimDb: number, time = this.context.currentTime): void {
    this.currentOutputTrimDb = Math.max(-60, Math.min(6, trimDb))
    this.trimGain.gain?.setTargetAtTime?.(decibelsToGain(this.currentOutputTrimDb), time, 0.02)
  }

  updatePatch(inserts: NativeSynthPatch['inserts'], outputTrimDb: number, time = this.context.currentTime): void {
    this.currentDrive = inserts.drive
    this.currentDriveBypass = inserts.driveBypass ?? false
    this.currentChorus = inserts.chorus
    this.currentChorusBypass = inserts.chorusBypass ?? false
    this.currentReverb = inserts.reverb ?? 0
    this.currentReverbBypass = inserts.reverbBypass ?? false
    this.applyDrive(this.currentDrive, this.currentDriveBypass, time)
    this.applyChorus(this.currentChorus, this.currentChorusBypass, time)
    this.applyReverb(this.currentReverb, this.currentReverbBypass, time)
    this.setOutputTrim(outputTrimDb, time)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const source of this.sources) {
      try {
        source.stop()
      } catch {
        // Ignore if already stopped
      }
    }
    for (const node of this.nodes) {
      try {
        node.disconnect()
      } catch {
        // Ignore if already disconnected
      }
    }
  }
}
