import { DEFAULT_MIDI_CLOCK_POLICY, MIDI_OUTPUT_BOUNDS } from '../../config/defaults'

export interface OutputClockSample {
  contextTimeSeconds: number
  performanceTimeMs: number
}

export interface OutputClockReading {
  contextTimeSeconds: number
  performanceTimeMs: number
  running: boolean
  outputTimestamp?: OutputClockSample
}

export interface OutputClockAnchor extends OutputClockSample {
  mode: 'output' | 'estimated'
}

export interface MidiClockPolicy {
  maxSampleAgeMs: number
  maxClockJumpMs: number
}

export function selectOutputClockAnchor(
  reading: OutputClockReading,
  policy: MidiClockPolicy = DEFAULT_MIDI_CLOCK_POLICY
): OutputClockAnchor | null {
  const { contextTimeSeconds, performanceTimeMs, outputTimestamp: pair } = reading
  if (
    !reading.running ||
    !Number.isFinite(contextTimeSeconds) ||
    contextTimeSeconds < 0 ||
    !Number.isFinite(performanceTimeMs) ||
    performanceTimeMs < 0
  )
    return null
  if (
    pair &&
    Number.isFinite(pair.contextTimeSeconds) &&
    pair.contextTimeSeconds > 0 &&
    Number.isFinite(pair.performanceTimeMs) &&
    pair.performanceTimeMs > 0 &&
    pair.contextTimeSeconds <= contextTimeSeconds &&
    pair.performanceTimeMs <= performanceTimeMs &&
    performanceTimeMs - pair.performanceTimeMs <= policy.maxSampleAgeMs &&
    (contextTimeSeconds - pair.contextTimeSeconds) * 1000 <= policy.maxSampleAgeMs
  ) {
    return { ...pair, mode: 'output' }
  }
  return { contextTimeSeconds, performanceTimeMs, mode: 'estimated' }
}

export function audioTimeToPerformanceMs(
  audioTimeSeconds: number,
  anchor: OutputClockAnchor,
  signalPathLatencySeconds: number,
  routeOffsetMs: number
): number {
  if (
    ![
      audioTimeSeconds,
      anchor.contextTimeSeconds,
      anchor.performanceTimeMs,
      signalPathLatencySeconds,
      routeOffsetMs
    ].every(Number.isFinite) ||
    audioTimeSeconds < 0 ||
    anchor.contextTimeSeconds < 0 ||
    anchor.performanceTimeMs < 0 ||
    signalPathLatencySeconds < 0 ||
    routeOffsetMs < MIDI_OUTPUT_BOUNDS.offsetMs.min ||
    routeOffsetMs > MIDI_OUTPUT_BOUNDS.offsetMs.max
  ) {
    throw new RangeError('Invalid output timing units or bounds.')
  }
  return (
    anchor.performanceTimeMs +
    (audioTimeSeconds - anchor.contextTimeSeconds + signalPathLatencySeconds) * 1000 +
    routeOffsetMs
  )
}

export function outputClockDiscontinuity(
  previous: OutputClockReading,
  next: OutputClockReading,
  policy: MidiClockPolicy = DEFAULT_MIDI_CLOCK_POLICY
): boolean {
  const audioDeltaMs = (next.contextTimeSeconds - previous.contextTimeSeconds) * 1000
  const performanceDeltaMs = next.performanceTimeMs - previous.performanceTimeMs
  return (
    previous.running !== next.running ||
    audioDeltaMs < 0 ||
    performanceDeltaMs < 0 ||
    Math.abs(audioDeltaMs - performanceDeltaMs) > policy.maxClockJumpMs
  )
}

export function validateMidiAdvanceBudget(
  offsetMs: number,
  lookAheadSeconds: number,
  pumpIntervalMs: number,
  guardMs: number
): boolean {
  return (
    [offsetMs, lookAheadSeconds, pumpIntervalMs, guardMs].every(Number.isFinite) &&
    lookAheadSeconds >= 0 &&
    pumpIntervalMs > 0 &&
    guardMs >= 0 &&
    Math.max(0, -offsetMs) + pumpIntervalMs + guardMs <= lookAheadSeconds * 1000
  )
}
