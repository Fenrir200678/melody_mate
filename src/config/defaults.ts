/**
 * ============================================================================
 * CENTRAL SOURCE OF TRUTH FOR ALL APPLICATION & GENERATOR DEFAULTS
 * ============================================================================
 * All default parameter values for the melody generator, variation modes,
 * project settings, and sound assignments MUST be defined exclusively in this
 * file.
 *
 * Guidelines for Contributors & AI Agents:
 * 1. NEVER introduce ad-hoc default values or magic numbers in Zod schemas,
 *    Pinia stores, or UI components.
 * 2. Zod schemas must reference these constants: e.g. `.default(DEFAULT_*.field)`.
 * 3. Pinia stores must initialize their state directly from these constants.
 * 4. Unit tests must NEVER assert against hardcoded numbers for default values;
 *    always compare against `DEFAULT_*` (e.g. `expect(...).toEqual(DEFAULT_*)`).
 *    This ensures balancing tweaks never break unrelated tests.
 * 5. Persisted user settings (generator params, project document) are stamped with a
 *    fingerprint of these defaults. Editing values here automatically supersedes stored
 *    payloads on the next app start, so these defaults always win over stale storage.
 * ============================================================================
 */
import type { VariationSettings } from './config.types'
import type { MidiOutputSettings } from '../core/midi/output.types'
import { version as appVersion } from '../../package.json'

export type { VariationSettings }

export const PROJECT_BAR_BOUNDS = { min: 1, max: 16 } as const

export const MIDI_OUTPUT_BOUNDS = {
  channel: { min: 1, max: 16 },
  pitch: { min: 0, max: 127 },
  onVelocity: { min: 1, max: 127 },
  offVelocity: { min: 0, max: 127 },
  // Scheduling must additionally validate negative offsets against the available lookahead.
  offsetMs: { min: -50, max: 50 }
} as const

export const DEFAULT_MIDI_TEST_NOTE = { midi: 60, velocity: 0.8, durationSeconds: 0.25 } as const

export const DEFAULT_MIDI_NOTE_OFF_VELOCITY = 0

export const DEFAULT_MIDI_OUTPUT_SETTINGS = {
  lead: { mode: 'internal', port: null, channel: 1, offsetMs: 0, sendPreviews: false },
  chord: { mode: 'internal', port: null, channel: 2, offsetMs: 0, sendPreviews: false }
} as const satisfies MidiOutputSettings

export const DEFAULT_MIDI_ENABLED_ROUTE_MODE = 'midi' as const

export const DEFAULT_TRANSPORT_OUTPUT = {
  sessionId: 'transport',
  chordVelocity: 0.75,
  minChordPickupSeconds: 0.05
} as const

/**
 * Standard project bar length choices offered in the DAW header dropdown.
 */
export const DEFAULT_PROJECT_BAR_OPTIONS = [1, 2, 4, 6, 8, 12, 16] as const

/**
 * Application branding, versioning, license, and repository links.
 */
export const APP_METADATA = {
  name: 'Melody Mate',
  edition: 'DAW Edition',
  version: appVersion,
  author: 'Fenrir',
  copyright: '© 2025–2026 Fenrir',
  tagline: 'Generative MIDI melody and chord progression workstation',
  license: 'Source-Available (Non-Commercial)',
  licenseDetails:
    'Free for personal, educational and non-commercial usage. Commercial redistribution, selling as plugin or monetized deployment is strictly prohibited without explicit written permission.',
  githubUrl: 'https://github.com/Fenrir200678/melody_mate',
  docsUrl: 'https://github.com/Fenrir200678/melody_mate/blob/main/docs/DOCS.md',
  issuesUrl: 'https://github.com/Fenrir200678/melody_mate/issues',
  legacyAppUrl: 'https://melody-mate-legacy-lime.vercel.app'
} as const

/**
 * Standard generator parameters used when resetting or initializing the generator.
 */
export const DEFAULT_GENERATOR_PARAMS = {
  minOctave: 4,
  maxOctave: 4,
  motif: 'FREE',
  motifVariation: 0.75,
  callAndResponse: false,
  answerStyle: 'echo',
  answerVariation: 0.75,
  markovOrder: 2,
  rhythmMode: 'preset',
  rhythmPresetId: 'edm-anthem',
  euclideanPulses: 5,
  euclideanSteps: 16,
  euclideanRotation: 0,
  euclideanSubdivision: '16n',
  restProbability: 0.05,
  noteLength: 1,
  noteLengthVariation: 0,
  accentStrength: 1,
  velocityVariation: 0.1,
  contour: 'free',
  contourStrength: 0.75,
  pentatonicMode: false,
  randomRhythmPreset: false,
  chordAdherence: 0.75,
  startWithRoot: false,
  endWithRoot: false,
  arpPattern: 'up',
  arpRate: '1/8',
  arpOctaveRange: 2,
  arpOctaveMode: 'up',
  arpBaseOctave: 3,
  arpPitchSource: 'pitch-classes',
  arpInversionCycling: false,
  arpSeed: 1,
  arpSeedLocked: false,
  arpGate: 80,
  arpAdherence: 100,
  arpAccent: 50,
  arpDensity: 100
} as const

export const DEFAULT_ARP_VARIATION_SEED = 1

export const SURPRISE_ME_RANGES = {
  markovOrder: { min: 1, max: 4, step: 1 },
  chordAdherence: { min: 0, max: 100, step: 5 },
  restProbability: { min: 0, max: 15, step: 5 },
  noteLength: { min: 50, max: 100, step: 5 }
} as const

/**
 * Default variation and mutation settings for melody session state.
 */
export const DEFAULT_VARIATION_SETTINGS: VariationSettings = {
  variationMode: 'mutate',
  mutationAxes: {
    rhythm: true,
    pitch: true,
    ornament: false,
    simplify: false
  },
  mutationStrength: 0.5,
  keepOriginalAsTake: true
}

/**
 * Standard project defaults (tempo, scale, arrangement length, loop settings).
 */
export const DEFAULT_PROJECT_SETTINGS = {
  bpm: 120,
  key: 'C',
  scale: 'major',
  bars: 4,
  swing: 0,
  timingLooseness: 0.1,
  loopStartStep: 0,
  loopEndStep: 64,
  workRange: { startStep: 0, endStep: 64 },
  isLooping: true,
  audioSavedAt: 0
} as const

/**
 * Default instrument sound assignment for playback and preview tracks.
 */
export const DEFAULT_AUDIO_SOUND_IDS = {
  lead: 'soft-triangle-keys',
  chord: 'triangle-comp'
} as const

/**
 * Default synthesizer macro controls (filter cutoffs, resonance, and effect sends).
 */
export const DEFAULT_SYNTH_MACROS = {
  leadCutoff: 4200,
  leadResonance: 1.0,
  leadDelaySend: 0.0,
  leadChorusSend: 0.0,
  leadReverbSend: 0.25,
  chordCutoff: 3800,
  chordDelaySend: 0.0,
  chordChorusSend: 0.05,
  chordReverbSend: 0.3
} as const

/**
 * Default master and track mixer levels, mute/solo flags, and protection states.
 */
export const DEFAULT_MIXER_SETTINGS = {
  masterVolume: 0.9,
  leadVolume: 0.9,
  chordVolume: 0.75,
  isLeadMuted: false,
  isChordMuted: false,
  isLeadSolo: false,
  isChordSolo: false,
  isBusCompressorActive: true,
  protectionStatus: 'idle' as const
} as const

/**
 * Maximum safe sample rate in Hz for Web Audio playback. Clamping sample rate to 48 kHz
 * protects against buffer underruns, pops/crackles, and audio worklet execution timeouts on
 * high-resolution studio audio interfaces (96 kHz, 192 kHz).
 */
export const MAX_SAFE_AUDIO_SAMPLE_RATE = 48000

/**
 * Default Web Audio context latency hint. 'balanced' provides a stable, glitch-resistant
 * buffer size (~512 samples / ~10.6 ms at 48 kHz) on desktop operating systems (specifically
 * Windows WASAPI shared mode) eliminating pops, crackles, and buffer underrun dropouts while
 * keeping audition note clicks imperceptibly fast.
 */
export const DEFAULT_AUDIO_LATENCY_HINT: AudioContextLatencyCategory = 'balanced'

/**
 * Lookahead window in seconds for Tone.js event scheduling. A 100 ms lookahead provides balanced headroom
 * against UI thread or garbage-collection pauses while keeping transport start and playback snappy.
 */
export const DEFAULT_AUDIO_LOOKAHEAD = 0.1

export const DEFAULT_MIDI_QUEUE_TIMING = {
  horizonMs: 30,
  pumpIntervalMs: 10,
  lateOnThresholdMs: 20,
  cancelGuardMs: 2
} as const

export const DEFAULT_MIDI_CLOCK_POLICY = {
  maxSampleAgeMs: 250,
  maxClockJumpMs: 50
} as const

/**
 * Debounce delay in milliseconds before audio settings snapshots are automatically committed to storage.
 */
export const AUDIO_SETTINGS_PERSISTENCE_DEBOUNCE_MS = 1000

/**
 * Default harmony workspace preferences and accompaniment playback settings.
 */
export const DEFAULT_HARMONY_SETTINGS = {
  useChords: true,
  backingVolume: 0.75,
  isMuted: false,
  adherence: 0.75,
  chordRegister: 3,
  defaultChordDuration: 1,
  voicingStyle: 'close' as const,
  autoSmooth: false,
  paletteClickMode: 'preview' as const
} as const

/**
 * Maximum capacity for stored generator takes.
 */
export const DEFAULT_TAKE_CAPACITY = 25

export const MIN_GAP_DURATION_BARS = 0.25
