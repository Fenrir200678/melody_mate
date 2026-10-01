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

export type { VariationSettings }

export const PROJECT_BAR_BOUNDS = { min: 1, max: 32 } as const

/**
 * Application branding, versioning, license, and repository links.
 */
export const APP_METADATA = {
  name: 'Melody Mate',
  edition: 'DAW Edition',
  version: '2.0.1',
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
