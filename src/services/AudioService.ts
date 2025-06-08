import type { Melody } from '@/models'
import * as Tone from 'tone'

export const instrumentOptions = {
  default: 'Klassischer Synth',
  fm: 'FM Synth',
  am: 'AM Synth'
} as const

export type InstrumentKey = keyof typeof instrumentOptions

let synth: Tone.PolySynth | null = null
let part: Tone.Part | null = null
let currentInstrumentKey: InstrumentKey | null = null

/**
 * Creates and returns a Tone.js synthesizer instance based on the selected instrument.
 * It caches the synth instance and recreates it only when the instrument changes.
 * @param instrument - The key of the instrument to create.
 */
function getSynth(instrument: InstrumentKey = 'default'): Tone.PolySynth {
  if (synth && currentInstrumentKey === instrument) {
    return synth
  }

  // Dispose previous synth if it exists
  if (synth) {
    synth.dispose()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let voice: any = Tone.Synth
  let voiceOptions = {}

  switch (instrument) {
    case 'fm':
      voice = Tone.FMSynth
      voiceOptions = {
        harmonicity: 3.01,
        modulationIndex: 14,
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.1 },
        modulation: { type: 'triangle' },
        modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 0.1 }
      }
      break
    case 'am':
      voice = Tone.AMSynth
      voiceOptions = {
        harmonicity: 2.5,
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.2 },
        modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }
      }
      break
    case 'default':
    default:
      voice = Tone.Synth
      voiceOptions = {
        oscillator: { type: 'fatsawtooth', count: 3, spread: 30 },
        envelope: { attack: 0.01, decay: 0.4, sustain: 0.2, release: 0.4 },
        volume: -8
      }
      break
  }

  synth = new Tone.PolySynth(voice).toDestination()
  synth.set({ ...voiceOptions, volume: -8 })

  currentInstrumentKey = instrument
  return synth
}

/**
 * Plays a melody using Tone.js.
 * @param melody - The melody to play.
 * @param bpm - The tempo in beats per minute.
 * @param instrument - The instrument to use for playback.
 * @param onEnded - Callback function to execute when playback has finished.
 */
export async function playMelody(
  melody: Melody,
  bpm: number,
  instrument: InstrumentKey = 'default',
  onEnded?: () => void
): Promise<void> {
  if (!melody.notes.length) {
    console.warn('Cannot play an empty melody.')
    return
  }

  // Ensure Tone.js context is started by user interaction
  await Tone.start()

  // Stop any previous playback
  if (part) {
    part.stop()
    part.dispose()
  }
  const transport = Tone.getTransport()
  if (transport.state === 'started') {
    transport.stop()
    transport.cancel()
  }

  const synthesizer = getSynth(instrument)
  transport.bpm.value = bpm

  // Create a sequence of events for the Part
  let currentTime = 0
  const events = melody.notes.map((note) => {
    const event = {
      time: currentTime,
      pitch: note.pitch,
      duration: note.duration,
      velocity: note.velocity
    }
    currentTime += Tone.Time(note.duration).toSeconds()
    return event
  })

  // Create and start the Part
  part = new Tone.Part((time, value) => {
    synthesizer.triggerAttackRelease(value.pitch, value.duration, time, value.velocity)
  }, events).start(0)
  part.loop = false

  transport.start()

  // Schedule the transport to stop after the part is finished
  transport.scheduleOnce((time) => {
    stopPlayback(time)
    onEnded?.()
  }, currentTime)
}

/**
 * Stops any currently playing audio and clears the transport.
 * @param time - (optional) The time at which to stop the transport (for accurate scheduling).
 */
export function stopPlayback(time?: number): void {
  const transport = Tone.getTransport()
  if (transport.state === 'started') {
    if (typeof time === 'number') {
      const safeTime = Math.max(0, time)
      transport.stop(safeTime)
    } else {
      transport.stop()
    }
    transport.cancel()
    part?.stop()
  }
}
