import type { SynthPresetDefinition } from './types'
import {
  ANALOG_SAW_PRESET,
  SYNTHWAVE_80S_PRESET,
  ACID_303_PRESET,
  RETRO_CHIPTUNE_PRESET,
  SYNC_LEAD_PRESET
} from './lead-electronic'
export * from './lead-electronic'

export const SOFT_TRIANGLE_KEYS_PRESET: SynthPresetDefinition = {
  id: 'soft-triangle-keys',
  name: 'Soft Triangle Keys',
  category: 'lead',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['keys', 'rounded', 'melodic'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'mono',
  description: 'Rounded, neutral synth keys with a focused attack for clear melodic sketches.',
  outputTrimDb: -12,
  options: {
    oscillator: { type: 'triangle' },
    filter: { Q: 0.7, type: 'lowpass', rolloff: -12 },
    envelope: { attack: 0.006, decay: 1.2, sustain: 0.22, release: 0.28 },
    filterEnvelope: { attack: 0.004, decay: 0.65, sustain: 0.2, release: 0.25, baseFrequency: 450, octaves: 3 }
  },
  defaultMacros: { cutoff: 4200, resonance: 1, delaySend: 0, reverbSend: 0.16 }
}

export const CRYSTAL_PLUCK_PRESET: SynthPresetDefinition = {
  id: 'crystal-pluck',
  name: 'Crystal Pluck',
  category: 'lead',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['pluck', 'fm', 'bright'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'fm',
  description:
    'A clear FM pluck whose bright strike quickly settles into a soft pitched tail; useful for repeating hooks.',
  outputTrimDb: -3,
  options: {
    harmonicity: 1,
    modulationIndex: 4.2,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.003, decay: 0.32, sustain: 0.02, release: 0.16 },
    modulation: { type: 'sine' },
    modulationEnvelope: { attack: 0.002, decay: 0.07, sustain: 0, release: 0.08 }
  },
  defaultMacros: { cutoff: 7600, resonance: 0.7, delaySend: 0.15, reverbSend: 0.12 }
}

export const PLUCK_ARP_PRESET: SynthPresetDefinition = {
  id: 'pluck-arp',
  name: 'Dry Arp Pluck',
  category: 'lead',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['pluck', 'short', 'arpeggio'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'synth',
  description: 'Dry, rounded triangle pluck with a short tail that leaves room between fast arpeggio steps.',
  outputTrimDb: -13,
  options: { oscillator: { type: 'triangle' }, envelope: { attack: 0.002, decay: 0.12, sustain: 0, release: 0.07 } },
  defaultMacros: { cutoff: 4400, resonance: 0.7, delaySend: 0.02, reverbSend: 0.03 }
}

export const GLASSY_FM_BELL_PRESET: SynthPresetDefinition = {
  id: 'glassy-fm-bell',
  name: 'Glassy FM Bell',
  category: 'lead',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['bell', 'fm', 'delicate'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'fm',
  description: 'Inharmonic FM bell with a long, delicate decay for sparse upper-register melodies.',
  outputTrimDb: -3,
  options: {
    harmonicity: 3.7,
    modulationIndex: 2.4,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.003, decay: 1.45, sustain: 0, release: 0.75 },
    modulation: { type: 'sine' },
    modulationEnvelope: { attack: 0.002, decay: 0.38, sustain: 0, release: 0.32 }
  },
  defaultMacros: { cutoff: 8000, resonance: 0.7, delaySend: 0.04, reverbSend: 0.26 }
}

export const VELVET_AM_PRESET: SynthPresetDefinition = {
  id: 'velvet-am',
  name: 'Velvet AM',
  category: 'lead',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['am', 'warm', 'pulsing'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'am',
  description: 'Warm amplitude-modulated lead with a soft pulse for restrained lyrical phrases.',
  outputTrimDb: 0,
  options: {
    harmonicity: 0.5,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.035, decay: 0.3, sustain: 0.75, release: 0.36 },
    modulation: { type: 'triangle' },
    modulationEnvelope: { attack: 0.08, decay: 0.25, sustain: 0.65, release: 0.25 }
  },
  defaultMacros: { cutoff: 2800, resonance: 0.7, delaySend: 0.03, reverbSend: 0.16 }
}

export const DARK_FM_LEAD_PRESET: SynthPresetDefinition = {
  id: 'dark-fm-lead',
  name: 'Dark FM Lead',
  category: 'lead',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['fm', 'dark', 'sustained'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'fm',
  description: 'Low-mid FM lead with a slow harmonic bloom for moody, sustained melodies.',
  outputTrimDb: -4,
  options: {
    harmonicity: 1.5,
    modulationIndex: 1.1,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.045, decay: 0.45, sustain: 0.7, release: 0.48 },
    modulation: { type: 'sine' },
    modulationEnvelope: { attack: 0.08, decay: 0.55, sustain: 0.35, release: 0.38 }
  },
  defaultMacros: { cutoff: 2600, resonance: 0.7, delaySend: 0.09, reverbSend: 0.17 }
}

export const PURE_SINE_PRESET: SynthPresetDefinition = {
  id: 'pure-sine',
  name: 'Pure Sine',
  category: 'lead',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['minimal', 'soft', 'sustained'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'synth',
  description: 'Unadorned sine voice for quiet, spacious counter-melodies and sparse arrangements.',
  outputTrimDb: -12,
  options: { oscillator: { type: 'sine' }, envelope: { attack: 0.02, decay: 0.12, sustain: 0.88, release: 0.42 } },
  defaultMacros: { cutoff: 8000, resonance: 0.7, delaySend: 0.04, reverbSend: 0.12 }
}

export const LEAD_PRESETS: SynthPresetDefinition[] = [
  SOFT_TRIANGLE_KEYS_PRESET,
  CRYSTAL_PLUCK_PRESET,
  ANALOG_SAW_PRESET,
  PLUCK_ARP_PRESET,
  SYNTHWAVE_80S_PRESET,
  ACID_303_PRESET,
  RETRO_CHIPTUNE_PRESET,
  GLASSY_FM_BELL_PRESET,
  SYNC_LEAD_PRESET,
  VELVET_AM_PRESET,
  DARK_FM_LEAD_PRESET,
  PURE_SINE_PRESET
]
