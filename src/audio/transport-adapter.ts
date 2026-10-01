import * as Tone from 'tone'
import { MAX_SAFE_AUDIO_SAMPLE_RATE } from '../config/defaults'
import { STEPS_PER_BAR } from '../core/schemas/project.schema'

export type AudioContextState = 'running' | 'suspended' | 'closed' | 'unsupported'

/**
 * Ensures the Web Audio AudioContext in Tone.js is configured with a safe sample rate (<= 48 kHz).
 *
 * High-end studio audio interfaces configured to 96 kHz or 192 kHz require audio blocks
 * to be processed in under 0.66 ms, causing buffer underruns (pops and crackles), watchdog
 * termination, or AudioWorklet execution timeouts. Clamping sampleRate to 48 kHz avoids this
 * while providing an exact integer submultiple (2:1 or 4:1) for studio hardware.
 */
export function ensureConfiguredAudioContext(maxRate = MAX_SAFE_AUDIO_SAMPLE_RATE): void {
  if (typeof window === 'undefined') return

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext

  if (!AudioContextClass) return

  try {
    const current = Tone.getContext()
    if (current && current.sampleRate && current.sampleRate <= maxRate) {
      return
    }

    const customContext = new AudioContextClass({
      latencyHint: 'interactive',
      sampleRate: maxRate
    })
    Tone.setContext(customContext, true)
  } catch {
    try {
      const fallbackContext = new AudioContextClass({
        latencyHint: 'interactive'
      })
      Tone.setContext(fallbackContext, true)
    } catch {
      // Keep existing Tone context if custom instantiation is blocked
    }
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
 * Current playback position in elapsed seconds.
 */
export function getTransportSeconds(): number {
  return Tone.getTransport().seconds
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
