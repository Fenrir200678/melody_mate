import type { SynthPresetDefinition } from './types'

export const WARM_AMBIENT_PAD_PRESET: SynthPresetDefinition = {
  id: 'warm-ambient-pad',
  name: 'Warm Ambient Pad',
  category: 'chord',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['pad', 'warm', 'sustained'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'synth',
  description: 'Softly detuned triangle pad for held harmony beneath plucked or bright leads.',
  outputTrimDb: -20,
  options: {
    oscillator: { type: 'fattriangle', count: 2, spread: 9 },
    envelope: { attack: 0.28, decay: 0.8, sustain: 0.65, release: 0.85 }
  },
  defaultMacros: { cutoff: 2400, chorusSend: 0.18, reverbSend: 0.28 }
}

export const JUNO_CHORDS_PRESET: SynthPresetDefinition = {
  id: 'juno-chords',
  name: 'Warm Analog Poly',
  category: 'chord',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['analog', 'poly', 'warm'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'mono',
  description: 'Warm detuned saw chords with a gentle filter sweep for sustained pop and retro accompaniment.',
  outputTrimDb: -18,
  options: {
    oscillator: { type: 'fatsawtooth', count: 2, spread: 12 },
    envelope: { attack: 0.035, decay: 0.55, sustain: 0.5, release: 0.4 },
    filter: { Q: 0.8, type: 'lowpass', rolloff: -24 },
    filterEnvelope: { attack: 0.025, decay: 0.6, sustain: 0.3, release: 0.4, baseFrequency: 500, octaves: 2.4 }
  },
  defaultMacros: { cutoff: 4200, chorusSend: 0.22, reverbSend: 0.18 }
}

export const GLASS_CATHEDRAL_PRESET: SynthPresetDefinition = {
  id: 'glass-cathedral',
  name: 'Glass Cathedral',
  category: 'chord',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['pad', 'fm', 'airy'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'fm',
  description: 'An airy harmonic FM pad with restrained upper partials for slow, open chord voicings.',
  outputTrimDb: -15,
  options: {
    harmonicity: 2,
    modulationIndex: 1.2,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.22, decay: 1, sustain: 0.5, release: 0.9 },
    modulation: { type: 'sine' },
    modulationEnvelope: { attack: 0.18, decay: 0.7, sustain: 0.12, release: 0.6 }
  },
  defaultMacros: { cutoff: 3800, chorusSend: 0.14, reverbSend: 0.3 }
}

export const VELVET_ORGAN_PRESET: SynthPresetDefinition = {
  id: 'velvet-organ',
  name: 'Velvet Organ',
  category: 'chord',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['organ', 'fm', 'sustained'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'fm',
  description: 'Steady sine-based FM organ with gentle odd harmonics for connected soul and gospel-style chord beds.',
  outputTrimDb: -14,
  options: {
    harmonicity: 2,
    modulationIndex: 0.45,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.014, decay: 0.1, sustain: 0.8, release: 0.12 },
    modulation: { type: 'sine' },
    modulationEnvelope: { attack: 0.014, decay: 0.1, sustain: 0.7, release: 0.1 }
  },
  defaultMacros: { cutoff: 3200, chorusSend: 0.12, reverbSend: 0.12 }
}

export const HOLLOW_PULSE_BED_PRESET: SynthPresetDefinition = {
  id: 'hollow-pulse-bed',
  name: 'Hollow Pulse Bed',
  category: 'chord',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['pulse', 'dark', 'sustained'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'mono',
  description: 'A narrow pulse with a soft filter bloom and steady tail for dark, focused electronic chord beds.',
  outputTrimDb: -28,
  options: {
    oscillator: { type: 'pulse', width: 0.28 },
    envelope: { attack: 0.12, decay: 0.45, sustain: 0.48, release: 0.65 },
    filter: { Q: 0.9, type: 'lowpass', rolloff: -24 },
    filterEnvelope: { attack: 0.18, decay: 0.6, sustain: 0.28, release: 0.55, baseFrequency: 280, octaves: 2.1 }
  },
  defaultMacros: { cutoff: 2100, chorusSend: 0.08, reverbSend: 0.2 }
}

export const AM_SHIMMER_CHORDS_PRESET: SynthPresetDefinition = {
  id: 'am-shimmer-chords',
  name: 'AM Shimmer Chords',
  category: 'chord',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['am', 'shimmering', 'moving'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'am',
  description: 'Shimmering amplitude-modulated tones with a soft harmonic bloom for dreamy harmony.',
  outputTrimDb: -5,
  options: {
    harmonicity: 0.5,
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.08, decay: 0.6, sustain: 0.5, release: 0.7 },
    modulation: { type: 'sine' },
    modulationEnvelope: { attack: 0.06, decay: 0.8, sustain: 0.35, release: 0.7 }
  },
  defaultMacros: { cutoff: 3600, chorusSend: 0.2, reverbSend: 0.26 }
}

export const BRASS_BLOOM_PRESET: SynthPresetDefinition = {
  id: 'brass-bloom',
  name: 'Brass Bloom',
  category: 'chord',
  version: 1,
  backend: 'tone',
  backendVersion: 1,
  tags: ['fm', 'brass', 'bold'],
  author: 'Melody Mate',
  source: 'factory',
  synthType: 'fm',
  description:
    'Bright FM brass-like chords with a rounded onset and firm sustain for bold cinematic and synth-pop lifts.',
  outputTrimDb: -14,
  options: {
    harmonicity: 1.5,
    modulationIndex: 2.8,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.045, decay: 0.55, sustain: 0.56, release: 0.38 },
    modulation: { type: 'sine' },
    modulationEnvelope: { attack: 0.018, decay: 0.42, sustain: 0.25, release: 0.3 }
  },
  defaultMacros: { cutoff: 5200, chorusSend: 0.06, reverbSend: 0.12 }
}
