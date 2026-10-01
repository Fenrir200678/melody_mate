import { parseSynthPatch, type NativeSynthPatch } from './patch'

/**
 * Default Init patch: Clean neutral subtractive voice ready for sound design and audio diagnostics.
 */
export const NATIVE_INIT_PATCH = parseSynthPatch({
  version: 1,
  id: 'init',
  name: 'Init',
  description: 'Clean default subtractive patch ready for sound design.',
  category: 'custom',
  tags: ['init', 'default', 'subtractive', 'reference'],
  author: 'Melody Mate',
  source: 'factory',
  outputTrimDb: -12,
  backend: 'native-subtractive',
  backendVersion: 1,
  voice: { mode: 'mono', maxVoices: 1, retrigger: true, legato: false, glideSeconds: 0, minMidi: 0, maxMidi: 127 },
  oscillators: {
    A: {
      enabled: true,
      waveform: 'sawtooth',
      detuneCents: 0,
      levelDb: -9,
      phase: 'reset',
      unison: 1,
      unisonDetuneCents: 15,
      panSpread: 0.4
    },
    B: {
      enabled: true,
      waveform: 'triangle',
      detuneCents: 0,
      levelDb: -15,
      phase: 'reset',
      unison: 1,
      unisonDetuneCents: 15,
      panSpread: 0.4
    }
  },
  sub: { enabled: true, waveform: 'sine', levelDb: -24, octave: -1 },
  noise: { enabled: false, type: 'white', levelDb: -60 },
  filter: { type: 'lowpass', slope: 12, cutoffHz: 8000, resonance: 1, keytracking: 0.5, drive: 0 },
  amp: { attack: 0.01, decay: 0.15, sustain: 0.7, release: 0.3 },
  modEnvelopes: [
    { attack: 0.01, decay: 0.2, sustain: 0, release: 0.2 },
    { attack: 0.01, decay: 0.2, sustain: 0, release: 0.2 }
  ],
  lfos: [
    { waveform: 'sine', rate: 1, sync: false, retrigger: true },
    { waveform: 'sine', rate: 1, sync: false, retrigger: true }
  ],
  macros: [0, 0, 0, 0],
  macroNames: ['Cutoff', 'Resonance', 'Macro 3', 'Macro 4'],
  modulation: [],
  inserts: { drive: 0, driveBypass: false, chorus: 0, chorusBypass: false, reverb: 0, reverbBypass: false }
}) as NativeSynthPatch

export const NATIVE_DIAGNOSTIC_PATCH = NATIVE_INIT_PATCH

/**
 * Warm Poly: Rich polyphonic analog brass/pad with dual detuned saws, warm lowpass and subtle chorus.
 */
export const NATIVE_WARM_POLY_PATCH = parseSynthPatch({
  version: 1,
  id: 'warm-poly',
  name: 'Warm Analog Poly',
  description:
    'Lush polyphonic analog brass and strings with dual detuned saws, warm 24dB lowpass filtering and gentle chorus width.',
  category: 'chord',
  tags: ['poly', 'warm', 'analog', 'chords', 'brass'],
  author: 'Melody Mate',
  source: 'factory',
  outputTrimDb: -14,
  backend: 'native-subtractive',
  backendVersion: 1,
  voice: { mode: 'poly', maxVoices: 8, retrigger: true, legato: false, glideSeconds: 0, minMidi: 0, maxMidi: 127 },
  oscillators: {
    A: {
      waveform: 'sawtooth',
      detuneCents: -5,
      levelDb: -9,
      phase: 'reset',
      unison: 2,
      unisonDetuneCents: 12,
      panSpread: 0.4
    },
    B: {
      waveform: 'sawtooth',
      detuneCents: 5,
      levelDb: -10,
      phase: 'reset',
      unison: 2,
      unisonDetuneCents: 15,
      panSpread: 0.4
    }
  },
  sub: { waveform: 'sine', levelDb: -22, octave: -1 },
  noise: { type: 'pink', levelDb: -48 },
  filter: { type: 'lowpass', slope: 24, cutoffHz: 3200, resonance: 1.2, keytracking: 0.6, drive: 0 },
  amp: { attack: 0.04, decay: 0.8, sustain: 0.65, release: 0.45 },
  modEnvelopes: [
    { attack: 0.06, decay: 0.9, sustain: 0.2, release: 0.4 },
    { attack: 0.1, decay: 0.5, sustain: 0, release: 0.2 }
  ],
  lfos: [
    { waveform: 'triangle', rate: 0.25, sync: false, retrigger: false },
    { waveform: 'sine', rate: 3.5, sync: false, retrigger: true }
  ],
  macros: [0.5, 0.2, 0.3, 0.4],
  macroNames: ['Cutoff', 'Resonance', 'Chorus Depth', 'Warmth'],
  modulation: [
    { source: 'modEnv1', target: 'filter.cutoffHz', depth: 0.35, polarity: 'unipolar', curve: 'exponential' },
    { source: 'lfo1', target: 'filter.cutoffHz', depth: 0.12, polarity: 'bipolar', curve: 'linear' },
    { source: 'macro1', target: 'filter.cutoffHz', depth: 0.4, polarity: 'unipolar', curve: 'linear' },
    { source: 'macro2', target: 'filter.resonance', depth: 0.3, polarity: 'unipolar', curve: 'linear' },
    { source: 'velocity', target: 'filter.cutoffHz', depth: 0.25, polarity: 'unipolar', curve: 'linear' }
  ],
  inserts: { drive: 0.1, driveBypass: false, chorus: 0.25, chorusBypass: false, reverb: 0.2, reverbBypass: false }
}) as NativeSynthPatch

/**
 * Wide Lead: Modern stereo supersaw lead with 4-voice unison spread, centered sub punch and mono legato glide.
 */
export const NATIVE_WIDE_LEAD_PATCH = parseSynthPatch({
  version: 1,
  id: 'wide-lead',
  name: 'Wide Saw Lead',
  description:
    'Bright modern stereo supersaw lead with 4-voice unison spread, centered sub punch and snappy envelope bite.',
  category: 'lead',
  tags: ['lead', 'supersaw', 'wide', 'stereo', 'modern'],
  author: 'Melody Mate',
  source: 'factory',
  outputTrimDb: -13,
  backend: 'native-subtractive',
  backendVersion: 1,
  voice: { mode: 'mono', maxVoices: 1, retrigger: false, legato: true, glideSeconds: 0.05, minMidi: 0, maxMidi: 127 },
  oscillators: {
    A: {
      waveform: 'sawtooth',
      detuneCents: 0,
      levelDb: -6,
      phase: 'reset',
      unison: 4,
      unisonDetuneCents: 24,
      panSpread: 0.8
    },
    B: {
      waveform: 'square',
      detuneCents: 7,
      levelDb: -10,
      phase: 'reset',
      unison: 2,
      unisonDetuneCents: 14,
      panSpread: 0.5
    }
  },
  sub: { waveform: 'triangle', levelDb: -14, octave: -1 },
  noise: { type: 'white', levelDb: -52 },
  filter: { type: 'lowpass', slope: 12, cutoffHz: 5500, resonance: 1.8, keytracking: 0.75, drive: 0 },
  amp: { attack: 0.005, decay: 0.4, sustain: 0.75, release: 0.25 },
  modEnvelopes: [
    { attack: 0.002, decay: 0.28, sustain: 0.15, release: 0.2 },
    { attack: 0.001, decay: 0.08, sustain: 0, release: 0.08 }
  ],
  lfos: [
    { waveform: 'sine', rate: 4.8, sync: false, retrigger: true },
    { waveform: 'triangle', rate: 0.5, sync: false, retrigger: false }
  ],
  macros: [0.6, 0.3, 0.2, 0.1],
  macroNames: ['Brightness', 'Glide Time', 'Drive Punch', 'Vibrato Depth'],
  modulation: [
    { source: 'modEnv1', target: 'filter.cutoffHz', depth: 0.45, polarity: 'unipolar', curve: 'exponential' },
    { source: 'velocity', target: 'filter.cutoffHz', depth: 0.3, polarity: 'unipolar', curve: 'linear' },
    { source: 'macro1', target: 'filter.cutoffHz', depth: 0.35, polarity: 'unipolar', curve: 'linear' },
    { source: 'lfo1', target: 'oscA.detuneCents', depth: 0.08, polarity: 'bipolar', curve: 'linear' }
  ],
  inserts: { drive: 0.18, driveBypass: false, chorus: 0.15, chorusBypass: false, reverb: 0.15, reverbBypass: false }
}) as NativeSynthPatch

/**
 * Focused Bass: Solid monophonic bass with centered sub weight, tight dynamics, and chorus bypassed for mono safety.
 */
export const NATIVE_FOCUSED_BASS_PATCH = parseSynthPatch({
  version: 1,
  id: 'focused-bass',
  name: 'Focused Punch Bass',
  description:
    'Solid monophonic low-end bass with zero phase cancellation, dedicated sub weight and tight punchy dynamics.',
  category: 'lead',
  tags: ['bass', 'punch', 'mono', 'focused', 'low-end'],
  author: 'Melody Mate',
  source: 'factory',
  outputTrimDb: -13,
  backend: 'native-subtractive',
  backendVersion: 1,
  voice: { mode: 'mono', maxVoices: 1, retrigger: true, legato: false, glideSeconds: 0.02, minMidi: 0, maxMidi: 127 },
  oscillators: {
    A: {
      waveform: 'sawtooth',
      detuneCents: 0,
      levelDb: -6,
      phase: 'reset',
      unison: 1,
      unisonDetuneCents: 0,
      panSpread: 0
    },
    B: {
      waveform: 'square',
      detuneCents: 0,
      levelDb: -12,
      phase: 'reset',
      unison: 1,
      unisonDetuneCents: 0,
      panSpread: 0
    }
  },
  sub: { waveform: 'sine', levelDb: -8, octave: -1 },
  noise: { type: 'white', levelDb: -60 },
  filter: { type: 'lowpass', slope: 24, cutoffHz: 950, resonance: 2.2, keytracking: 0.5, drive: 0 },
  amp: { attack: 0.003, decay: 0.35, sustain: 0.45, release: 0.18 },
  modEnvelopes: [
    { attack: 0.002, decay: 0.22, sustain: 0.05, release: 0.15 },
    { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
  ],
  lfos: [
    { waveform: 'sine', rate: 0.5, sync: false, retrigger: true },
    { waveform: 'sawtooth', rate: 1.0, sync: false, retrigger: true }
  ],
  macros: [0.4, 0.2, 0.25, 0.0],
  macroNames: ['Bass Cutoff', 'Resonance Bite', 'Sub Saturation', 'Decay Length'],
  modulation: [
    { source: 'modEnv1', target: 'filter.cutoffHz', depth: 0.6, polarity: 'unipolar', curve: 'exponential' },
    { source: 'velocity', target: 'filter.cutoffHz', depth: 0.35, polarity: 'unipolar', curve: 'linear' },
    { source: 'velocity', target: 'oscA.levelDb', depth: 0.2, polarity: 'unipolar', curve: 'linear' },
    { source: 'macro1', target: 'filter.cutoffHz', depth: 0.35, polarity: 'unipolar', curve: 'linear' },
    { source: 'macro2', target: 'filter.resonance', depth: 0.3, polarity: 'unipolar', curve: 'linear' }
  ],
  inserts: { drive: 0.22, driveBypass: false, chorus: 0.0, chorusBypass: true, reverb: 0.0, reverbBypass: true }
}) as NativeSynthPatch

/**
 * Transient Pluck: Crisp percussive acoustic-inspired pluck with high velocity response and quick wooden decay.
 */
export const NATIVE_TRANSIENT_PLUCK_PATCH = parseSynthPatch({
  version: 1,
  id: 'transient-pluck',
  name: 'Transient Kalimba Pluck',
  description:
    'Crisp percussive acoustic-inspired pluck with high velocity sensitivity, short wooden decay and air transient.',
  category: 'lead',
  tags: ['pluck', 'percussive', 'transient', 'acoustic', 'kalimba'],
  author: 'Melody Mate',
  source: 'factory',
  outputTrimDb: -12,
  backend: 'native-subtractive',
  backendVersion: 1,
  voice: { mode: 'poly', maxVoices: 8, retrigger: true, legato: false, glideSeconds: 0, minMidi: 0, maxMidi: 127 },
  oscillators: {
    A: {
      waveform: 'triangle',
      detuneCents: 0,
      levelDb: -6,
      phase: 'reset',
      unison: 1,
      unisonDetuneCents: 0,
      panSpread: 0
    },
    B: {
      waveform: 'sine',
      detuneCents: 1200,
      levelDb: -14,
      phase: 'reset',
      unison: 1,
      unisonDetuneCents: 0,
      panSpread: 0
    }
  },
  sub: { waveform: 'sine', levelDb: -26, octave: -1 },
  noise: { type: 'white', levelDb: -32 },
  filter: { type: 'lowpass', slope: 24, cutoffHz: 4200, resonance: 1.5, keytracking: 0.85, drive: 0 },
  amp: { attack: 0.002, decay: 0.28, sustain: 0.05, release: 0.22 },
  modEnvelopes: [
    { attack: 0.001, decay: 0.16, sustain: 0, release: 0.15 },
    { attack: 0.001, decay: 0.025, sustain: 0, release: 0.02 }
  ],
  lfos: [
    { waveform: 'sine', rate: 5.0, sync: false, retrigger: true },
    { waveform: 'triangle', rate: 0.2, sync: false, retrigger: false }
  ],
  macros: [0.5, 0.3, 0.1, 0.2],
  macroNames: ['Brightness', 'Damping', 'Body Size', 'Air Transient'],
  modulation: [
    { source: 'modEnv1', target: 'filter.cutoffHz', depth: 0.55, polarity: 'unipolar', curve: 'exponential' },
    { source: 'velocity', target: 'filter.cutoffHz', depth: 0.45, polarity: 'unipolar', curve: 'linear' },
    { source: 'velocity', target: 'oscA.levelDb', depth: 0.3, polarity: 'unipolar', curve: 'linear' },
    { source: 'macro1', target: 'filter.cutoffHz', depth: 0.3, polarity: 'unipolar', curve: 'linear' },
    { source: 'macro2', target: 'filter.resonance', depth: 0.25, polarity: 'unipolar', curve: 'linear' }
  ],
  inserts: { drive: 0.05, driveBypass: false, chorus: 0.1, chorusBypass: false, reverb: 0.25, reverbBypass: false }
}) as NativeSynthPatch

/**
 * Moving Pad: Evolving atmospheric pad with slow dual LFO filter modulation, shimmer and lush chorus width.
 */
export const NATIVE_MOVING_PAD_PATCH = parseSynthPatch({
  version: 1,
  id: 'moving-pad',
  name: 'Ethereal Motion Pad',
  description:
    'Spacious evolving atmospheric pad with slow dual LFO filter modulation, stereo shimmer and long lush tails.',
  category: 'chord',
  tags: ['pad', 'ambient', 'evolving', 'chords', 'ethereal'],
  author: 'Melody Mate',
  source: 'factory',
  outputTrimDb: -15,
  backend: 'native-subtractive',
  backendVersion: 1,
  voice: { mode: 'poly', maxVoices: 8, retrigger: false, legato: false, glideSeconds: 0, minMidi: 0, maxMidi: 127 },
  oscillators: {
    A: {
      waveform: 'sawtooth',
      detuneCents: -7,
      levelDb: -9,
      phase: 'reset',
      unison: 3,
      unisonDetuneCents: 18,
      panSpread: 0.6
    },
    B: {
      waveform: 'triangle',
      detuneCents: 7,
      levelDb: -8,
      phase: 'reset',
      unison: 2,
      unisonDetuneCents: 12,
      panSpread: 0.4
    }
  },
  sub: { waveform: 'sine', levelDb: -24, octave: -1 },
  noise: { type: 'pink', levelDb: -46 },
  filter: { type: 'lowpass', slope: 12, cutoffHz: 2100, resonance: 2.0, keytracking: 0.4, drive: 0 },
  amp: { attack: 0.6, decay: 1.4, sustain: 0.8, release: 1.2 },
  modEnvelopes: [
    { attack: 0.8, decay: 2.0, sustain: 0.4, release: 1.0 },
    { attack: 1.2, decay: 1.8, sustain: 0.2, release: 1.2 }
  ],
  lfos: [
    { waveform: 'sine', rate: 0.18, sync: false, retrigger: false },
    { waveform: 'triangle', rate: 0.35, sync: false, retrigger: false }
  ],
  macros: [0.4, 0.3, 0.4, 0.5],
  macroNames: ['Filter Opening', 'Resonance Sweeps', 'Motion Rate', 'Lush Chorus'],
  modulation: [
    { source: 'lfo1', target: 'filter.cutoffHz', depth: 0.3, polarity: 'bipolar', curve: 'linear' },
    { source: 'modEnv1', target: 'filter.cutoffHz', depth: 0.25, polarity: 'unipolar', curve: 'linear' },
    { source: 'macro1', target: 'filter.cutoffHz', depth: 0.4, polarity: 'unipolar', curve: 'linear' },
    { source: 'lfo2', target: 'oscA.detuneCents', depth: 0.1, polarity: 'bipolar', curve: 'linear' }
  ],
  inserts: { drive: 0.05, driveBypass: false, chorus: 0.35, chorusBypass: false, reverb: 0.35, reverbBypass: false }
}) as NativeSynthPatch

/**
 * Complete collection of native subtractive factory presets.
 */
export const NATIVE_FACTORY_PATCHES: readonly NativeSynthPatch[] = Object.freeze([
  NATIVE_WARM_POLY_PATCH,
  NATIVE_WIDE_LEAD_PATCH,
  NATIVE_FOCUSED_BASS_PATCH,
  NATIVE_TRANSIENT_PLUCK_PATCH,
  NATIVE_MOVING_PAD_PATCH,
  NATIVE_INIT_PATCH
])
