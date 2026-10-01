import type { SynthPresetDefinition } from './types'
import {
  WARM_AMBIENT_PAD_PRESET,
  JUNO_CHORDS_PRESET,
  GLASS_CATHEDRAL_PRESET,
  VELVET_ORGAN_PRESET,
  HOLLOW_PULSE_BED_PRESET,
  AM_SHIMMER_CHORDS_PRESET,
  BRASS_BLOOM_PRESET
} from './chord-textures'
export * from './chord-textures'

export const TRIANGLE_COMP_PRESET: SynthPresetDefinition = {
  id: 'triangle-comp',
  name: 'Triangle Comp',
  category: 'chord',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['keys', 'rounded', 'versatile'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'mono',
  description:
    'Dry, rounded triangle chords with a clear attack and compact decay for understated pop, folk, and lo-fi comping.',
  outputTrimDb: -20,
  options: {
    oscillator: { type: 'triangle' },
    filter: { Q: 0.7, type: 'lowpass', rolloff: -12 },
    envelope: { attack: 0.008, decay: 1.4, sustain: 0.24, release: 0.32 },
    filterEnvelope: { attack: 0.005, decay: 0.8, sustain: 0.22, release: 0.3, baseFrequency: 380, octaves: 3 }
  },
  defaultMacros: { cutoff: 3800, chorusSend: 0.04, reverbSend: 0.16 }
}

export const ELECTRIC_PIANO_PRESET: SynthPresetDefinition = {
  id: 'electric-piano',
  name: 'Tine Electric Keys',
  category: 'chord',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['keys', 'fm', 'soul'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'fm',
  description:
    'Mellow FM electric keys with a brief tine-like attack and soft body for extended jazz and soul voicings.',
  outputTrimDb: -12,
  options: {
    harmonicity: 2,
    modulationIndex: 1.6,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.006, decay: 1.4, sustain: 0.15, release: 0.38 },
    modulation: { type: 'sine' },
    modulationEnvelope: { attack: 0.003, decay: 0.24, sustain: 0.02, release: 0.18 }
  },
  defaultMacros: { cutoff: 4200, chorusSend: 0.16, reverbSend: 0.16 }
}

export const LOFI_KEYS_PRESET: SynthPresetDefinition = {
  id: 'lofi-keys',
  name: 'Damped Keys',
  category: 'chord',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['keys', 'mellow', 'short'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'synth',
  description: 'Muted triangle keys with a short, rounded decay for intimate lo-fi and sparse accompaniment.',
  outputTrimDb: -20,
  options: { oscillator: { type: 'triangle' }, envelope: { attack: 0.012, decay: 0.42, sustain: 0.12, release: 0.22 } },
  defaultMacros: { cutoff: 1500, chorusSend: 0.08, reverbSend: 0.14 }
}

export const DUB_STAB_PRESET: SynthPresetDefinition = {
  id: 'dub-stab',
  name: 'Dub Stab',
  category: 'chord',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['stab', 'analog', 'short'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'mono',
  description: 'Compact saw chord stab with a quick closing filter for syncopated house and dub accompaniment.',
  outputTrimDb: -18,
  options: {
    oscillator: { type: 'sawtooth' },
    filter: { Q: 1.4, type: 'lowpass', rolloff: -24 },
    envelope: { attack: 0.004, decay: 0.23, sustain: 0.03, release: 0.14 },
    filterEnvelope: { attack: 0.003, decay: 0.18, sustain: 0.02, release: 0.12, baseFrequency: 350, octaves: 3 }
  },
  defaultMacros: { cutoff: 5000, chorusSend: 0.08, reverbSend: 0.2 }
}

export const MUTED_PLUCK_CHORDS_PRESET: SynthPresetDefinition = {
  id: 'muted-pluck-chords',
  name: 'Muted Pluck Chords',
  category: 'chord',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['pluck', 'fm', 'short'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'fm',
  description: 'Soft harmonic FM plucks for broken chords and rhythmic accompaniment without a dense sustained bed.',
  outputTrimDb: -10,
  options: {
    harmonicity: 1,
    modulationIndex: 1.1,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.004, decay: 0.32, sustain: 0, release: 0.16 },
    modulation: { type: 'sine' },
    modulationEnvelope: { attack: 0.002, decay: 0.1, sustain: 0, release: 0.08 }
  },
  defaultMacros: { cutoff: 3600, chorusSend: 0.06, reverbSend: 0.14 }
}

export const CHORD_PRESETS: SynthPresetDefinition[] = [
  TRIANGLE_COMP_PRESET,
  WARM_AMBIENT_PAD_PRESET,
  ELECTRIC_PIANO_PRESET,
  JUNO_CHORDS_PRESET,
  LOFI_KEYS_PRESET,
  GLASS_CATHEDRAL_PRESET,
  VELVET_ORGAN_PRESET,
  DUB_STAB_PRESET,
  MUTED_PLUCK_CHORDS_PRESET,
  HOLLOW_PULSE_BED_PRESET,
  AM_SHIMMER_CHORDS_PRESET,
  BRASS_BLOOM_PRESET
]
