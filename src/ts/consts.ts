import type { ScaleIntervals } from '@/ts/types/scale.types'

export const instrumentOptions = {
  default: 'Klassischer Synth',
  fm: 'FM Synth',
  am: 'AM Synth'
} as const

export const STEPS_PER_4N: Readonly<Record<string, number>> = {
  '1n': 4,
  '2n.': 3,
  '2n': 2,
  '4n.': 1
}

export const STEPS_PER_8N: Readonly<Record<string, number>> = {
  '1n': 8,
  '2n.': 6,
  '2n': 4,
  '4n.': 3,
  '4n': 2,
  '8n.': 1
}

export const STEPS_PER_16N: Readonly<Record<string, number>> = {
  '1n': 16,
  '2n.': 12,
  '2n': 8,
  '4n.': 6,
  '4n': 4,
  '8n.': 3,
  '8n': 2,
  '16n': 1
}

export const STEPS_PER_32N: Readonly<Record<string, number>> = {
  '1n': 32,
  '2n.': 24,
  '2n': 16,
  '4n.': 12,
  '4n': 8,
  '8n.': 6,
  '8n': 4,
  '16n': 2,
  '32n': 1
}

export const DURATION_MAP: Readonly<Record<string, Readonly<Record<number, string>>>> = {
  '32n': { 1: '32n', 2: '16n', 3: '16n.', 4: '8n', 6: '8n.', 8: '4n', 12: '4n.', 16: '2n', 24: '2n.', 32: '1n' },
  '16n': { 1: '16n', 2: '8n', 3: '8n.', 4: '4n', 6: '4n.', 8: '2n', 12: '2n.', 16: '1n' },
  '8n': { 1: '8n', 2: '4n', 3: '4n.', 4: '2n', 6: '2n.', 8: '1n' },
  '4n': { 1: '4n', 2: '2n', 3: '2n.', 4: '1n' }
} as const

export const RHYTHM_CATEGORIES = {
  melody: 'Melody',
  world: 'World',
  bass: 'Bass'
} as const

export const ALL_KEYS = [
  { name: 'C', value: 'C' },
  { name: 'C#', value: 'C#' },
  { name: 'D', value: 'D' },
  { name: 'D#', value: 'D#' },
  { name: 'E', value: 'E' },
  { name: 'F', value: 'F' },
  { name: 'F#', value: 'F#' },
  { name: 'G', value: 'G' },
  { name: 'G#', value: 'G#' },
  { name: 'A', value: 'A' },
  { name: 'A#', value: 'A#' },
  { name: 'B', value: 'B' }
]

export const SCALE_DEFINITIONS: ScaleIntervals = {
  'Major Scale': [0, 2, 4, 5, 7, 9, 11],
  'Minor Scale': [0, 2, 3, 5, 7, 8, 10],
  'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
  'Melodic Minor': [0, 2, 3, 5, 7, 9, 11],
  'Major Bebop': [0, 2, 4, 5, 7, 8, 9, 11],
  'Minor Bebop': [0, 2, 3, 4, 5, 7, 9, 10],
  Blues: [0, 3, 5, 6, 7, 10],
  'Pentatonic Major Scale': [0, 2, 4, 7, 9],
  'Pentatonic Minor Scale': [0, 3, 5, 7, 10],
  'Dorian Mode': [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  'Lydian Mode': [0, 2, 4, 6, 7, 9, 11],
  'Mixolydian Mode': [0, 2, 4, 5, 7, 9, 10],
  'Locrian Mode': [0, 1, 3, 5, 6, 8, 10],
  'Whole Tone Scale': [0, 2, 4, 6, 8, 10],
  'Diminished Scale (Half-Whole)': [0, 1, 3, 4, 6, 7, 9, 10],
  'Diminished Scale (Whole-Half)': [0, 2, 3, 5, 6, 8, 9, 11],
  'Hungarian Minor Scale': [0, 2, 3, 6, 7, 8, 11],
  'Phrygian Dominant Scale': [0, 1, 4, 5, 7, 8, 10],
  'Arabic (Double Harmonic) Scale': [0, 1, 4, 5, 7, 8, 11],
  'Japanese (Ichikosucho)': [0, 1, 5, 7, 8]
}
