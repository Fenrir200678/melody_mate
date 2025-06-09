import type { ScaleIntervals } from '@/ts/types/scale.types'

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
