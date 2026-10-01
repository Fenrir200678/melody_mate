import type { SynthPresetDefinition } from './types'

export const ANALOG_SAW_PRESET: SynthPresetDefinition = {
  id: 'analog-saw',
  name: 'Focused Saw',
  category: 'lead',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['analog', 'focused', 'lead'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'mono',
  description: 'Fast, focused saw lead with a short filter bite for articulate electronic hooks.',
  outputTrimDb: -10,
  options: {
    oscillator: { type: 'fatsawtooth', count: 2, spread: 6 },
    envelope: { attack: 0.004, decay: 0.17, sustain: 0.48, release: 0.13 },
    filter: { Q: 1.4, type: 'lowpass', rolloff: -24 },
    filterEnvelope: { attack: 0.003, decay: 0.16, sustain: 0.28, release: 0.13, baseFrequency: 650, octaves: 3.2 }
  },
  defaultMacros: { cutoff: 5600, resonance: 0.8, delaySend: 0.06, reverbSend: 0.07 }
}

export const SYNTHWAVE_80S_PRESET: SynthPresetDefinition = {
  id: 'synthwave-80s',
  name: 'Wide Retro Lead',
  category: 'lead',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['analog', 'sustained', 'retro'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'synth',
  description: 'Broad, slowly opening detuned saw for sustained retro hooks and slower phrases.',
  outputTrimDb: -15,
  options: {
    oscillator: { type: 'fatsawtooth', count: 3, spread: 24 },
    envelope: { attack: 0.065, decay: 0.55, sustain: 0.72, release: 0.48 }
  },
  defaultMacros: { cutoff: 3300, resonance: 0.7, delaySend: 0.13, reverbSend: 0.22 }
}

export const ACID_303_PRESET: SynthPresetDefinition = {
  id: 'acid-303',
  name: 'Acid Bite',
  category: 'lead',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['resonant', 'short', 'electronic'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'mono',
  description: 'Square-wave acid pluck with a falling resonant filter for short rhythmic phrases.',
  outputTrimDb: -18,
  options: {
    oscillator: { type: 'square' },
    filter: { Q: 3.2, type: 'lowpass', rolloff: -24 },
    envelope: { attack: 0.004, decay: 0.18, sustain: 0.08, release: 0.09 },
    filterEnvelope: { attack: 0.003, decay: 0.18, sustain: 0.08, release: 0.1, baseFrequency: 250, octaves: 3.5 }
  },
  defaultMacros: { cutoff: 6000, resonance: 0.7, delaySend: 0.12, reverbSend: 0.06 }
}

export const RETRO_CHIPTUNE_PRESET: SynthPresetDefinition = {
  id: 'retro-chiptune',
  name: 'Chip Square',
  category: 'lead',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['square', 'retro', 'short'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'synth',
  description: 'Dry square-wave voice with a tight release for precise arcade-style phrases.',
  outputTrimDb: -15,
  options: { oscillator: { type: 'square' }, envelope: { attack: 0.004, decay: 0.1, sustain: 0.4, release: 0.08 } },
  defaultMacros: { cutoff: 8500, resonance: 0.5, delaySend: 0, reverbSend: 0.02 }
}

export const SYNC_LEAD_PRESET: SynthPresetDefinition = {
  id: 'sync-lead',
  name: 'Hollow Pulse',
  category: 'lead',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['pulse', 'focused', 'lead'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'mono',
  description: 'Hollow pulse lead with a restrained filter contour for distinct, vocal-like melodic hooks.',
  outputTrimDb: -18,
  options: {
    oscillator: { type: 'pulse', width: 0.2 },
    envelope: { attack: 0.009, decay: 0.25, sustain: 0.45, release: 0.2 },
    filter: { Q: 0.9, type: 'lowpass', rolloff: -12 },
    filterEnvelope: { attack: 0.012, decay: 0.3, sustain: 0.3, release: 0.2, baseFrequency: 800, octaves: 2.2 }
  },
  defaultMacros: { cutoff: 5000, resonance: 0.7, delaySend: 0.1, reverbSend: 0.14 }
}
