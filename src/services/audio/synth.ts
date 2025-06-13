import type { InstrumentKey } from '@/ts/types/audio.types'
import * as Tone from 'tone'

let synth: Tone.PolySynth | null = null
let currentInstrumentKey: InstrumentKey | null = null

/**
 * Creates and returns a Tone.js synthesizer instance based on the selected instrument.
 * It caches the synth instance and recreates it only when the instrument changes.
 * @param instrument - The key of the instrument to create.
 */
export function getSynth(instrument: InstrumentKey = 'default'): Tone.PolySynth {
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
