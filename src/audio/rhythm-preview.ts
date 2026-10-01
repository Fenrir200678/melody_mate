import * as Tone from 'tone'
import type { CustomRhythmPattern } from '../core/schemas/custom-rhythm.schema'
import type { EffectsRack } from './mixer/effects-rack'
import { ensureAudioContextRunning } from './transport-adapter'

const STEPS_PER_BAR = 16
const CLICK_SECONDS = 0.045
const CLICK_LOOKAHEAD_SECONDS = 0

export interface RhythmPreviewStartOptions {
  readonly transportRunning?: boolean
  readonly transportPositionSteps?: number
}

/** Plays one custom rhythm cycle through the protected master path. */
export class RhythmPreviewController {
  private readonly clickSynth: Tone.Synth
  private timers: ReturnType<typeof setTimeout>[] = []
  private generation = 0
  private disposed = false
  private onFinished: (() => void) | undefined

  constructor(effectsRack: EffectsRack) {
    this.clickSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.018 },
      volume: -18
    })
    this.clickSynth.connect(effectsRack.previewInput)
  }

  async start(
    pattern: CustomRhythmPattern,
    bpm: number,
    options: RhythmPreviewStartOptions = {},
    onStep?: (step: number) => void,
    onFinished?: () => void
  ): Promise<boolean> {
    this.stop()
    if (this.disposed || pattern.events.length === 0 || !(await ensureAudioContextRunning())) return false

    const generation = this.generation
    const safeBpm = Math.max(30, Math.min(320, bpm))
    const stepSeconds = 60 / safeBpm / 4
    const transport = Tone.getTransport()
    const transportRunning = options.transportRunning ?? transport.state === 'started'
    const startTime = this.getStartTime(transportRunning)
    const cycleSteps = pattern.bars * STEPS_PER_BAR
    const cycleSeconds = cycleSteps * stepSeconds
    this.onFinished = onFinished

    for (const event of pattern.events) {
      const clickTime = startTime + event.step * stepSeconds
      const accent = event.velocity >= 104
      const velocity = Math.min(0.55, 0.16 + (event.velocity / 127) * 0.23)
      this.schedule(
        () => {
          if (this.generation !== generation) return
          this.clickSynth.triggerAttackRelease(accent ? 'C7' : 'G6', CLICK_SECONDS, Tone.now(), velocity)
        },
        Math.max(0, (clickTime - Tone.now() - CLICK_LOOKAHEAD_SECONDS) * 1000)
      )
    }

    const startDelayMs = Math.max(0, (startTime - Tone.now()) * 1000)
    this.schedulePlayhead(generation, 0, cycleSteps, stepSeconds, startDelayMs, onStep)
    this.schedule(
      () => {
        if (this.generation !== generation) return
        this.stop()
      },
      startDelayMs + cycleSeconds * 1000
    )

    return true
  }

  stop(): void {
    this.generation += 1
    const onFinished = this.onFinished
    this.onFinished = undefined
    for (const timer of this.timers) clearTimeout(timer)
    this.timers = []
    if (!this.disposed) {
      const now = Tone.now()
      this.clickSynth.triggerRelease(now)
    }
    onFinished?.()
  }

  dispose(): void {
    if (this.disposed) return
    this.stop()
    this.disposed = true
    this.clickSynth.dispose()
  }

  private getStartTime(transportRunning: boolean): number {
    if (transportRunning) {
      return Tone.getTransport().nextSubdivision('1m') + CLICK_LOOKAHEAD_SECONDS
    }

    return Tone.now() + CLICK_LOOKAHEAD_SECONDS
  }

  private schedulePlayhead(
    generation: number,
    step: number,
    cycleSteps: number,
    stepSeconds: number,
    startDelayMs: number,
    onStep?: (step: number) => void
  ): void {
    this.schedule(() => {
      if (this.generation !== generation || step >= cycleSteps) return
      onStep?.(step)
      this.schedulePlayhead(generation, step + 1, cycleSteps, stepSeconds, stepSeconds * 1000, onStep)
    }, startDelayMs)
  }

  private schedule(callback: () => void, delayMs: number): ReturnType<typeof setTimeout> {
    const timer = setTimeout(
      () => {
        this.timers = this.timers.filter((activeTimer) => activeTimer !== timer)
        callback()
      },
      Math.max(0, delayMs)
    )
    this.timers.push(timer)
    return timer
  }
}
