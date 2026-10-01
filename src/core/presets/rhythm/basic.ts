import type { RhythmPreset } from '../../rhythm/types'

export const BASIC_RHYTHMS: readonly RhythmPreset[] = [
  {
    id: 'arpeggio-flow',
    name: 'Straight Sixteenths',
    category: 'melody',
    subdivision: '16n',
    description: 'Sixteen even notes per bar for arpeggios, ostinatos, and sequencer basslines.',
    steps: Array.from({ length: 16 }, () => ({ isNote: true, durationSteps: 1 }))
  },
  {
    id: 'eighth-note-groove',
    name: 'Straight Eighths',
    category: 'melody',
    subdivision: '16n',
    description: 'Eight even notes per bar for melodic lines and driving bass patterns.',
    steps: Array.from({ length: 8 }, () => ({ isNote: true, durationSteps: 2 }))
  }
]
