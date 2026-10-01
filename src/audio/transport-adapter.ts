import * as Tone from 'tone'
import {
  DEFAULT_AUDIO_LATENCY_HINT,
  DEFAULT_AUDIO_LOOKAHEAD,
  MAX_SAFE_AUDIO_SAMPLE_RATE
} from '../config/defaults'
import { STEPS_PER_BAR } from '../core/schemas/project.schema'

export type AudioContextState = 'running' | 'suspended' | 'closed' | 'unsupported'

let isAudioContextConfigured = false

/**
 * Returns whether the audio context has already been explicitly configured for DAW playback.
 */
export function isAudioContextConfiguredState(): boolean {
  return isAudioContextConfigured
}

/**
 * Resets the context configuration flag. Used exclusively in unit tests.
 */
export function resetAudioContextConfigurationForTesting(): void {
  isAudioContextConfigured = false
}

/**
 * Ensures the Web Audio AudioContext in Tone.js is configured for glitch-resistant DAW playback:
 * 1. Clamps sample rate to <= 48 kHz to prevent buffer underruns and AudioWorklet timeouts on
 *    high-resolution studio interfaces (96 kHz, 192 kHz).
 * 2. Applies `latencyHint: 'balanced'` to prevent buffer underruns, pops, crackles, and WASAPI stream
 *    starvation on Windows 11 Chrome/Edge while keeping note audition latency virtually imperceptible (~10.6 ms).
 * 3. Sets Tone.js lookAhead to 0.1s (100 ms) to keep transport start and playhead tracking snappy
 *    while providing adequate scheduling headroom.
 */
export function ensureConfiguredAudioContext(
  maxRate = MAX_SAFE_AUDIO_SAMPLE_RATE,
  latencyHint: AudioContextLatencyCategory = DEFAULT_AUDIO_LATENCY_HINT,
  lookAhead = DEFAULT_AUDIO_LOOKAHEAD
): void {
  if (typeof window === 'undefined') return

  if (isAudioContextConfigured) {
    const current = Tone.getContext()
    if (current && current.sampleRate && current.sampleRate <= maxRate) {
      return
    }
  }

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext

  if (!AudioContextClass) return

  try {
    const customContext = new AudioContextClass({
      latencyHint,
      sampleRate: maxRate
    })
    Tone.setContext(customContext, true)
    isAudioContextConfigured = true
  } catch {
    try {
      const fallbackContext = new AudioContextClass({
        latencyHint
      })
      Tone.setContext(fallbackContext, true)
      isAudioContextConfigured = true
    } catch {
      // Keep existing Tone context if custom instantiation is blocked
    }
  }

  try {
    const current = Tone.getContext()
    if (current && 'lookAhead' in current) {
      current.lookAhead = lookAhead
    }
  } catch {
    // Ignore if lookahead property is read-only or unsupported
  }
}

/**
 * Audio-clock timestamps for parameter automation. Keeping these behind one module means the
 * runtime ramps continuous controls and fades on the audio clock instead of on UI timers, and
 * tests can stub a single clock source instead of the whole Tone namespace.
 */
export function now(): number {
  return Tone.now()
}

/** Converts a Tone time notation (e.g. '8n') into seconds at the current transport tempo. */
export function timeNotationToSeconds(duration: string): number {
  return Tone.Time(duration).toSeconds()
}

/**
 * Ensures the Web Audio AudioContext is instantiated and running.
 * Tone.start() must be triggered in response to a user gesture in browsers.
 */
export async function ensureAudioContextRunning(): Promise<boolean> {
  try {
    ensureConfiguredAudioContext()
    const ctx = Tone.getContext()
    if (ctx && ctx.state !== 'running') {
      await Tone.start()
    }
    return ctx ? ctx.state === 'running' : false
  } catch {
    return false
  }
}

/**
 * Checks if the Web Audio context is active and processing audio.
 */
export function isAudioStarted(): boolean {
  try {
    const ctx = Tone.getContext()
    return ctx ? ctx.state === 'running' : false
  } catch {
    return false
  }
}

/**
 * Returns current raw state of the AudioContext.
 */
export function getAudioContextState(): AudioContextState {
  try {
    const ctx = Tone.getContext()
    return ctx ? (ctx.state as AudioContextState) : 'unsupported'
  } catch {
    return 'unsupported'
  }
}

/**
 * Returns the current Web Audio sample rate in Hz (e.g. 44100 or 48000), or 0 if uninitialized.
 */
export function getAudioSampleRate(): number {
  try {
    const ctx = Tone.getContext()
    return ctx?.sampleRate ?? 0
  } catch {
    return 0
  }
}

/**
 * Sets transport tempo in beats per minute, optionally ramping over a time window.
 */
export function setBpm(bpm: number, rampTime = 0): void {
  const clamped = Math.max(30, Math.min(320, bpm))
  const transport = Tone.getTransport()
  if (rampTime > 0) {
    transport.bpm.rampTo(clamped, rampTime)
  } else {
    transport.bpm.value = clamped
  }
}

/**
 * Reads current transport tempo.
 */
export function getBpm(): number {
  return Tone.getTransport().bpm.value
}

/**
 * Sets time signature on the transport (e.g. 4 for 4/4 time or [3, 4] for 3/4).
 */
export function setTimeSignature(timeSignature: number | [number, number]): void {
  Tone.getTransport().timeSignature = timeSignature
}

/**
 * Reads the current time signature.
 */
export function getTimeSignature(): number | number[] {
  return Tone.getTransport().timeSignature
}

/**
 * Starts playback on the Tone Transport.
 */
export function startTransport(time?: number | string): void {
  Tone.getTransport().start(time)
}

/**
 * Pauses playback without resetting playhead position.
 */
export function pauseTransport(time?: number | string): void {
  Tone.getTransport().pause(time)
}

/**
 * Stops playback and rewinds to position 0 or loop start.
 */
export function stopTransport(): void {
  const transport = Tone.getTransport()
  transport.stop()
  transport.position = 0
}

/**
 * Returns playback transport state: 'started', 'stopped', or 'paused'.
 */
export function getTransportState(): 'started' | 'stopped' | 'paused' {
  return Tone.getTransport().state
}

/**
 * Sets the transport playhead position (e.g. '0:0:0' or seconds).
 */
export function setTransportPosition(position: string | number): void {
  Tone.getTransport().position = position
}

/**
 * Current playback position in elapsed seconds according to Tone.now() (includes scheduling lookahead).
 */
export function getTransportSeconds(): number {
  return Tone.getTransport().seconds
}

/**
 * Returns the audible playback position in elapsed seconds.
 * Evaluated at Tone.immediate() (context.currentTime) instead of Tone.now() (currentTime + lookAhead)
 * so that visual playhead positions stay locked to the physical audio output.
 */
export function getAudibleTransportSeconds(): number {
  const transport = Tone.getTransport()
  if (transport.state === 'started') {
    try {
      if (typeof transport.getSecondsAtTime === 'function') {
        const immediateTime = typeof Tone.immediate === 'function' ? Tone.immediate() : Tone.now()
        const result = transport.getSecondsAtTime(immediateTime)
        if (typeof result === 'number' && Number.isFinite(result)) {
          return Math.max(0, result)
        }
      }
    } catch {
      // Fall back to transport.seconds if getSecondsAtTime is unavailable or throws
    }
  }
  return transport.seconds
}

/**
 * Current playback position in elapsed ticks.
 */
export function getTransportTicks(): number {
  return Tone.getTransport().ticks
}

/**
 * Converts a canonical sixteenth-note project step to a Tone transport position.
 */
export function stepToTransportPosition(step: number): string {
  const safeStep = Math.max(0, Math.round(step))
  const bar = Math.floor(safeStep / STEPS_PER_BAR)
  const quarter = Math.floor((safeStep % STEPS_PER_BAR) / 4)
  const sixteenth = safeStep % 4
  return `${bar}:${quarter}:${sixteenth}`
}

/**
 * Configures start and end points for transport looping on the project step grid.
 */
export function setTransportLoop(startStep: number, endStep: number, isLooping: boolean): void {
  const transport = Tone.getTransport()
  const start = Math.max(0, Math.round(startStep))
  const end = Math.max(start + 1, Math.round(endStep))
  transport.loopStart = stepToTransportPosition(start)
  transport.loopEnd = stepToTransportPosition(end)
  transport.loop = isLooping
}

export function rampTransportBpm(bpm: number): void {
  const transport = Tone.getTransport()
  transport.bpm.rampTo(bpm, 0.05)
}
