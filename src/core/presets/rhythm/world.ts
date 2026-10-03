import type { RhythmPreset } from '../../rhythm/types'

export const WORLD_RHYTHMS: readonly RhythmPreset[] = [
  {
    id: 'tresillo',
    name: 'Tresillo',
    category: 'world',
    subdivision: '16n',
    description: 'The fundamental Afro-Cuban 3+3+2 rhythmic cell (6+6+4 steps in 16n).',
    steps: [
      { isNote: true, durationSteps: 6 },
      { isNote: true, durationSteps: 6 },
      { isNote: true, durationSteps: 4 }
    ]
  },
  {
    id: 'cinquillo',
    name: 'Cinquillo',
    category: 'world',
    subdivision: '16n',
    description: 'Iconic 5-pulse Caribbean syncopation: 2+1+2+1+2 feel (4+2+4+2+4 steps).',
    steps: [
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 }
    ]
  },
  {
    id: 'son-clave',
    name: 'Son Clave (3:2)',
    category: 'world',
    subdivision: '16n',
    description: 'Two-bar 3:2 son clave: three entries in the first 4/4 bar, two in the second.',
    steps: [
      { isNote: true, durationSteps: 6 },
      { isNote: true, durationSteps: 6 },
      { isNote: true, durationSteps: 8 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 8 }
    ]
  },
  {
    id: 'rumba-clave',
    name: 'Rumba Clave (3:2)',
    category: 'world',
    subdivision: '16n',
    description: 'Two-bar 3:2 rumba clave with a delayed third entry in the first 4/4 bar.',
    steps: [
      { isNote: true, durationSteps: 6 },
      { isNote: true, durationSteps: 8 },
      { isNote: true, durationSteps: 6 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 8 }
    ]
  },
  {
    id: 'bossa-nova',
    name: 'Bossa Nova Groove',
    category: 'world',
    subdivision: '16n',
    description: 'Gentle, syncopated Brazilian rhythmic pattern for chords and melody.',
    steps: [
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 2 }
    ]
  },
  {
    id: 'samba-groove',
    name: 'Samba Groove',
    category: 'world',
    subdivision: '16n',
    description: 'Fast, festive Brazilian carnival syncopation.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 }
    ]
  },
  {
    id: 'arabic-maqsum',
    name: 'Arabic Maqsum',
    category: 'world',
    subdivision: '16n',
    description: 'Maqsum-inspired line entering on beat one, the offbeats of one and two, then beats three and four.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 4 }
    ]
  },
  {
    id: 'habanera',
    name: 'Habanera',
    category: 'world',
    subdivision: '16n',
    description: 'Classic 4/4 syncopated Afro-Cuban and Spanish tango-habanera cadence.',
    steps: [
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 }
    ]
  }
]
