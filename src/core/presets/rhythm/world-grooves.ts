import type { RhythmPreset } from '../../rhythm/types'

export const WORLD_GROOVE_RHYTHMS: readonly RhythmPreset[] = [
  {
    id: 'son-clave-2-3',
    name: 'Son Clave (2:3)',
    category: 'world',
    subdivision: '16n',
    description:
      'Two-bar 2:3 son-clave line: two strokes on beats two and three, followed by three on beat one, the and of two, and beat four.',
    steps: [
      { isNote: false, durationSteps: 4 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 8 },
      { isNote: true, durationSteps: 6 },
      { isNote: true, durationSteps: 6 },
      { isNote: true, durationSteps: 4 }
    ]
  },
  {
    id: 'rumba-clave-2-3',
    name: 'Rumba Clave (2:3)',
    category: 'world',
    subdivision: '16n',
    description:
      'Two-bar 2:3 rumba-clave line with strokes on beats two and three, then beat one, the and of two, and the and of four.',
    steps: [
      { isNote: false, durationSteps: 4 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 8 },
      { isNote: true, durationSteps: 6 },
      { isNote: true, durationSteps: 8 },
      { isNote: true, durationSteps: 2 }
    ]
  },
  {
    id: 'afrobeat-interlock',
    name: 'Afrobeat Interlock',
    category: 'world',
    subdivision: '16n',
    description:
      'Entries on beats one, two, and three lead into two offbeats for a single-line Afrobeat-inspired phrase.',
    steps: [
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 }
    ]
  },
  {
    id: 'highlife-guitar-pulse',
    name: 'Highlife Guitar Pulse',
    category: 'world',
    subdivision: '16n',
    description:
      'One-bar interlocking eighth-note phrase with deliberate gaps, inspired by the repeating guitar patterns found in Ghanaian highlife.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 }
    ]
  },
  {
    id: 'soca-offbeat-drive',
    name: 'Soca Offbeat Drive',
    category: 'world',
    subdivision: '16n',
    description:
      'One-bar melodic or bass phrase pairing grounded quarter-note entries with short offbeat responses; a Soca-inspired sketch, not a complete Carnival groove.',
    steps: [
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 }
    ]
  },
  {
    id: 'baiao-syncopated-line',
    name: 'Baião Syncopated Line',
    category: 'world',
    subdivision: '16n',
    description:
      'A quarter-note opening and pause lead into paired eighths on beat three and its offbeat for a Baião-inspired line.',
    steps: [
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 4 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 4 }
    ]
  },
  {
    id: 'tango-milonga-phrase',
    name: 'Tango-Milonga Phrase',
    category: 'world',
    subdivision: '16n',
    description:
      'A dotted-eighth/sixteenth opening figure leads into eighth-note responses and a pause for a tango-milonga-inspired phrase.',
    steps: [
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 }
    ]
  },
  {
    id: 'dembow-melodic-response',
    name: 'Dembow Melodic Response',
    category: 'world',
    subdivision: '16n',
    description:
      'Entries on beat one, the offbeats of two and three, and beat four form a dembow-inspired melody or bass response.',
    steps: [
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 }
    ]
  }
]
