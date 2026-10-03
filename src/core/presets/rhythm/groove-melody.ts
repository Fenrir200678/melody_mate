import type { RhythmPreset } from '../../rhythm/types'

export const GROOVE_MELODY_RHYTHMS: readonly RhythmPreset[] = [
  {
    id: 'house-piano-push',
    name: 'House Piano Push',
    category: 'melody',
    subdivision: '16n',
    description: 'Short offbeat entries alternate with eighth-note pushes into the next half-bar.',
    steps: [
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 3 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 3 },
      { isNote: true, durationSteps: 2 }
    ]
  },
  {
    id: 'trance-release',
    name: 'Trance Release Arp',
    category: 'melody',
    subdivision: '16n',
    description:
      'Three cells of two sixteenths followed by an eighth drive forward before a quarter-note break on beat four.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 4 }
    ]
  },
  {
    id: 'breakbeat-cut',
    name: 'Breakbeat Cut Lead',
    category: 'melody',
    subdivision: '16n',
    description: 'Mixed eighth and sixteenth entries interrupted by uneven gaps for a broken-beat lead phrase.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 3 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 3 }
    ]
  },
  {
    id: 'electro-funk-hook',
    name: 'Electro-Funk Hook',
    category: 'melody',
    subdivision: '16n',
    description: 'Short separated hits and a dotted-eighth hold lead to a syncopated closing group.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 3 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 3 }
    ]
  },
  {
    id: 'rnb-answer',
    name: 'R&B Answer Phrase',
    category: 'melody',
    subdivision: '16n',
    description:
      'A dotted-eighth opening pair, a quarter-note gap, and two later holds shape an R&B-inspired response.',
    steps: [
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 4 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 3 },
      { isNote: false, durationSteps: 3 }
    ]
  },
  {
    id: 'indie-pop-lift',
    name: 'Indie Pop Lift',
    category: 'melody',
    subdivision: '16n',
    description: 'A first-beat rest leads into paired eighths and a dotted figure, leaving a short closing gap.',
    steps: [
      { isNote: false, durationSteps: 4 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 }
    ]
  },
  {
    id: 'ambient-breath',
    name: 'Ambient Breath',
    category: 'melody',
    subdivision: '16n',
    description: 'A dotted-half-note opening and an eight-step gap lead into a second-bar half note.',
    steps: [
      { isNote: true, durationSteps: 12 },
      { isNote: false, durationSteps: 8 },
      { isNote: true, durationSteps: 8 },
      { isNote: false, durationSteps: 4 }
    ]
  },
  {
    id: 'cinematic-slow-build',
    name: 'Cinematic Slow Build',
    category: 'melody',
    subdivision: '16n',
    description:
      'Four bars move from a single held note through quarter and eighth pulses to a short closing flourish.',
    steps: [
      { isNote: true, durationSteps: 8 },
      { isNote: false, durationSteps: 8 },
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 4 },
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 4 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 8 }
    ]
  },
  {
    id: 'jazz-pushed-phrase',
    name: 'Jazz-Inspired Pushed Phrase',
    category: 'melody',
    subdivision: '16n',
    description: 'An offbeat opening and dotted figures surround a quarter-note gap on the straight grid.',
    steps: [
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 4 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 }
    ]
  },
  {
    id: 'pop-two-bar-release',
    name: 'Pop Two-Bar Release',
    category: 'melody',
    subdivision: '16n',
    description:
      'A compact opening hook and pause lead to two eighth-note entries and a half-note hold in the second bar.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 4 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 8 },
      { isNote: false, durationSteps: 4 }
    ]
  }
]
