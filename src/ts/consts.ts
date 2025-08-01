export const SEQUENCER_STEPS_PER_BAR = 16

export const NOTE_DURATIONS = {
  WHOLE: 1,
  HALF: 0.5,
  DOTTED_HALF: 0.75,
  QUARTER: 0.25,
  DOTTED_QUARTER: 0.375,
  EIGHTH: 0.125,
  DOTTED_EIGHTH: 0.1875,
  SIXTEENTH: 0.0625,
  DOTTED_SIXTEENTH: 0.09375
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
