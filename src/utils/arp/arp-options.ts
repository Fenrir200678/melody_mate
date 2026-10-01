import { DEFAULT_GENERATOR_PARAMS } from '@/config/defaults'
import type { ArpOctaveMode, ArpPattern, ArpPitchSource, ArpRate } from '@/core/schemas/generator.schema'
import type { SegmentOption } from '@/utils/segmented.utils'

export const arpPatternOptions: SegmentOption<ArpPattern>[] = [
  { label: 'Up', value: 'up', title: 'Up: Ascends through chord tones from lowest to highest' },
  { label: 'Down', value: 'down', title: 'Down: Descends through chord tones from highest to lowest' },
  { label: 'Up-Down', value: 'up-down', title: 'Up-Down: Ascends then descends continuously' },
  { label: 'Down-Up', value: 'down-up', title: 'Down-Up: Descends then ascends continuously' },
  { label: 'Pedal', value: 'pedal-bass', title: 'Pedal Bass: Alternates lowest root note with upper chord tones' },
  { label: 'Pinky', value: 'pinky-top', title: 'Pinky Top: Alternates highest melody note with lower chord tones' },
  { label: 'Converge', value: 'converge', title: 'Converge: Outside-in movement towards the center tone' },
  { label: 'Diverge', value: 'diverge', title: 'Diverge: Inside-out movement expanding from center outward' },
  { label: 'Random', value: 'random', title: 'Random: Pure uniform random selection of chord tones' },
  { label: 'Brown', value: 'brown', title: 'Brownian: Semi-random drift with directional momentum and neighbor steps' },
  { label: 'Chord', value: 'chord-rhythm', title: 'Chord Rhythm: Plays full chord voicings in rhythmic pulses' }
]

export const arpRateOptions: SegmentOption<ArpRate>[] = [
  { label: '1/16', value: '1/16', title: '1/16: Fast sixteenth-note arpeggiation' },
  { label: '1/8', value: '1/8', title: '1/8: Standard eighth-note division' },
  { label: '1/8d', value: '1/8d', title: '1/8d (Dotted 8th): 3-step polyrhythmic groove (3 against 4)' },
  { label: '1/4', value: '1/4', title: '1/4: Quarter-note step rate' },
  { label: '1/4d', value: '1/4d', title: '1/4d (Dotted Quarter): 6-step wide chord sweep' }
]

export const arpOctaveModeOptions: SegmentOption<ArpOctaveMode>[] = [
  { label: 'Up', value: 'up', title: 'Up: Move to the next higher octave after each pattern cycle' },
  { label: 'Down', value: 'down', title: 'Down: Move to the next lower octave after each pattern cycle' },
  {
    label: 'Alternate',
    value: 'alternate',
    title:
      'Alternate: Pendulum through octaves after each pattern cycle, without repeating endpoints. With two octaves, the sequence is identical to Up.'
  },
  { label: 'Zigzag', value: 'zigzag', title: 'Zigzag: Pendulum through octaves on each sounding note' }
]

export const arpPitchSourceOptions: SegmentOption<ArpPitchSource>[] = [
  {
    label: 'Pitch classes',
    value: 'pitch-classes',
    title: 'Pitch classes: Rebuilds the pool from chord pitch classes in the base octave / octave range window'
  },
  {
    label: 'Chord voicing',
    value: 'chord-voicing',
    title: 'Chord voicing: Arpeggiates the absolute pitches and inversions edited in Chord Studio'
  }
]

export const arpControlTooltips = {
  pattern: 'Select arpeggio sequence pattern',
  rate: 'Select step rate division',
  pitchSource: 'Pitch source: rebuild the pool from pitch classes, or follow the absolute Chord Studio voicing',
  inversionCycling: 'Cycle chord inversions once per bar, keeping the pitch pool centered around its register',
  baseOctave: 'Base Octave: Starting octave for lowest chord tone (C1–C6)',
  octaveRange: 'Octave Range: Number of octaves spanned by pitch pool (1–4)',
  octaveMode: 'Octave mode: Select octave travel independently of the chord-note pattern',
  octaveModeSingle: 'Requires octave range > 1',
  octaveModeVoicing: 'Chord voicing mode uses the absolute Chord Studio register',
  register: 'Active register range determined by base octave and octave range',
  registerVoicing: 'Chord voicing mode: the register is the real range of the active Chord Studio voicings',
  registerInactive: 'No active chord in the work range: falling back to the pitch classes window',
  gate: 'Gate: Note duration as percentage of step division (20% staccato – 100% legato)',
  adherence: 'Adherence: Strict chord tones vs. diatonic passing tones (0%–100%)',
  accent: 'Accent: Metric velocity articulation and dynamic variation across the bar (0%–100%)',
  density: 'Density: Step activity ratio and metric rest masking (50%–100%)',
  seed: 'Random seed for arpeggio variation and pattern decisions',
  seedLocked: 'Seed is locked. Click to switch to Auto',
  seedAuto: 'Auto seed. Click to lock current seed'
} as const

export const formatNoteC = (v: number) => `C${v}`
export const formatOctaves = (v: number) => `${v} Oct`
export const formatPercent = (v: number) => `${v}%`

export interface ArpArticulationKnobConfig {
  key: 'arpGate' | 'arpAdherence' | 'arpAccent' | 'arpDensity'
  label: string
  min: number
  max: number
  defaultVal: number
  tooltip: string
}

export const ARP_ARTICULATION_KNOBS: readonly ArpArticulationKnobConfig[] = [
  {
    key: 'arpGate',
    label: 'Gate',
    min: 20,
    max: 100,
    defaultVal: DEFAULT_GENERATOR_PARAMS.arpGate,
    tooltip: arpControlTooltips.gate
  },
  {
    key: 'arpAdherence',
    label: 'Adherence',
    min: 0,
    max: 100,
    defaultVal: DEFAULT_GENERATOR_PARAMS.arpAdherence,
    tooltip: arpControlTooltips.adherence
  },
  {
    key: 'arpAccent',
    label: 'Accent',
    min: 0,
    max: 100,
    defaultVal: DEFAULT_GENERATOR_PARAMS.arpAccent,
    tooltip: arpControlTooltips.accent
  },
  {
    key: 'arpDensity',
    label: 'Density',
    min: 50,
    max: 100,
    defaultVal: DEFAULT_GENERATOR_PARAMS.arpDensity,
    tooltip: arpControlTooltips.density
  }
]
