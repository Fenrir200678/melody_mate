import * as Tone from 'tone'

export const synths = [
  {
    name: 'FM Synth',
    description: 'Frequency Modulation Synth',
    value: 'fm',
    voice: Tone.FMSynth,
    options: {
      harmonicity: 3.01,
      modulationIndex: 14,
      envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.5 },
      modulation: { type: 'triangle' },
      modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 0.1 }
    }
  },
  {
    name: 'AM Synth',
    description: 'Amplitude Modulation Synth',
    value: 'am',
    voice: Tone.AMSynth,
    options: {
      harmonicity: 2.5,
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.2 },
      modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }
    }
  },
  {
    name: 'Synth',
    description: 'Fat Sawtooth Synth',
    value: 'default',
    voice: Tone.Synth,
    options: {
      oscillator: { type: 'fatsawtooth', count: 3, spread: 30 },
      envelope: { attack: 0.01, decay: 0.4, sustain: 0.2, release: 0.4 }
    }
  }
]
