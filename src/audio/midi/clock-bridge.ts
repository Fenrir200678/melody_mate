import * as Tone from 'tone'
import { DEFAULT_MIDI_CLOCK_POLICY } from '../../config/defaults'
import {
  audioTimeToPerformanceMs,
  outputClockDiscontinuity,
  selectOutputClockAnchor
} from '../../core/transport/output-timing'
import type { MidiClockPolicy, OutputClockAnchor, OutputClockReading } from '../../core/transport/output-timing'

export interface MidiClockEnvironment {
  read(): OutputClockReading
  signalPathLatencySeconds(): number
}

export class MidiClockBridge {
  private readonly environment: MidiClockEnvironment
  private readonly policy: MidiClockPolicy
  private anchor: OutputClockAnchor | null = null
  private previous?: OutputClockReading
  private epoch = 0

  constructor(environment: MidiClockEnvironment, policy: MidiClockPolicy = DEFAULT_MIDI_CLOCK_POLICY) {
    if (
      !Number.isFinite(policy.maxSampleAgeMs) ||
      policy.maxSampleAgeMs <= 0 ||
      !Number.isFinite(policy.maxClockJumpMs) ||
      policy.maxClockJumpMs < 0
    )
      throw new RangeError('Invalid MIDI clock policy.')
    this.environment = environment
    this.policy = policy
  }

  sample() {
    const reading = this.environment.read()
    const discontinuity = !!this.previous && outputClockDiscontinuity(this.previous, reading, this.policy)
    const candidate = selectOutputClockAnchor(reading, this.policy)
    // A missing device timestamp does not invalidate calibration while the underlying clocks remain continuous.
    const next =
      !discontinuity && this.anchor?.mode === 'output' && candidate?.mode === 'estimated' ? this.anchor : candidate
    const changed =
      !!this.previous &&
      (discontinuity ||
        (this.anchor &&
          next &&
          this.anchor.mode === next.mode &&
          Math.abs(audioTimeToPerformanceMs(next.contextTimeSeconds, this.anchor, 0, 0) - next.performanceTimeMs) >
            this.policy.maxClockJumpMs))
    if (changed) ++this.epoch
    this.anchor = next
    this.previous = reading
    return {
      anchor: next ? { ...next } : null,
      epoch: this.epoch,
      changed,
      performanceTimeMs: reading.performanceTimeMs
    }
  }

  map(audioTimeSeconds: number, routeOffsetMs: number): number {
    if (!this.anchor) throw new Error('MIDI clock is not running; sample before scheduling.')
    return audioTimeToPerformanceMs(
      audioTimeSeconds,
      this.anchor,
      this.environment.signalPathLatencySeconds(),
      routeOffsetMs
    )
  }

  reset(): void {
    this.anchor = null
    this.previous = undefined
    ++this.epoch
  }
}

/** Pass the rack's graph latency here, never the playhead's base/output-latency sum. */
export function createToneMidiClockBridge(signalPathLatencySeconds: () => number): MidiClockBridge {
  return new MidiClockBridge({
    signalPathLatencySeconds,
    read() {
      const context = Tone.getContext().rawContext
      let outputTimestamp: OutputClockReading['outputTimestamp']
      if ('getOutputTimestamp' in context) {
        try {
          const pair = context.getOutputTimestamp()
          outputTimestamp = {
            contextTimeSeconds: pair.contextTime ?? NaN,
            performanceTimeMs: pair.performanceTime ?? NaN
          }
        } catch {
          /* Unavailable output calibration uses an explicitly estimated anchor. */
        }
      }
      return {
        contextTimeSeconds: context.currentTime,
        performanceTimeMs: performance.now(),
        running: context.state === 'running',
        outputTimestamp
      }
    }
  })
}
