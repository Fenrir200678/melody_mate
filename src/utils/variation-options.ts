import type { MutationAxes, TransformOp } from '@/core/variation'

export const variationModeOptions: { label: string; value: 'mutate' | 'transform'; title: string }[] = [
  { label: 'Mutate', value: 'mutate', title: 'Stochastic mutation along selected musical axes' },
  {
    label: 'Transform',
    value: 'transform',
    title: 'Deterministic musical operations (inversion, reverse, scale shifts)'
  }
]

export const mutationAxisOptions: { label: string; value: keyof MutationAxes; title: string }[] = [
  { label: 'Rhythm', value: 'rhythm', title: 'Rhythm: shift note onsets and vary durations' },
  { label: 'Pitch', value: 'pitch', title: 'Pitch: shift pitches to nearby scale and chord tones' },
  { label: 'Ornament', value: 'ornament', title: 'Ornament: insert passing notes and flourishes' },
  { label: 'Simplify', value: 'simplify', title: 'Simplify: prune weaker notes to increase clarity' }
]

export const transformOptions: { label: string; value: TransformOp; description: string }[] = [
  { label: 'Invert', value: 'invert', description: 'Mirror scale intervals around the first note.' },
  { label: 'Reverse', value: 'reverse', description: 'Reverse the phrase in time within the active region.' },
  { label: 'One up', value: 'one-up', description: 'Move every note up one scale step.' },
  { label: 'One down', value: 'one-down', description: 'Move every note down one scale step.' },
  { label: 'Double', value: 'double', description: 'Double note lengths and spacing; trim at the region end.' },
  {
    label: 'Halve',
    value: 'halve',
    description: 'Halve lengths and spacing, with a one-grid-step minimum where possible.'
  },
  {
    label: 'Octave up',
    value: 'octave-up',
    description: 'Move the whole phrase up 12 semitones, preserving its intervals.'
  },
  {
    label: 'Octave down',
    value: 'octave-down',
    description: 'Move the whole phrase down 12 semitones, preserving its intervals.'
  },
  {
    label: 'Displace forward',
    value: 'displace-forward',
    description: 'Move onsets forward one grid step, keeping notes inside the region.'
  },
  {
    label: 'Displace back',
    value: 'displace-back',
    description: 'Move onsets back one grid step, keeping notes inside the region.'
  }
]
