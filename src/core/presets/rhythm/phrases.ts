import type { RhythmPreset } from '../../rhythm/types'

export const PHRASE_RHYTHMS: readonly RhythmPreset[] = [
  {
    id: 'pickup-hook',
    name: 'Pickup Hook',
    category: 'melody',
    subdivision: '16n',
    description: 'Two eighth-note pickups on beat four lead into the second bar of a two-bar hook.',
    steps: [
      { isNote: false, durationSteps: 12 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 4 }
    ]
  },
  {
    id: 'sparse-offbeat-lead',
    name: 'Sparse Offbeat Lead',
    category: 'melody',
    subdivision: '16n',
    description: 'Three short offbeat entries separated by rests, leaving the downbeat open.',
    steps: [
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 3 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 4 }
    ]
  },
  {
    id: 'two-bar-question-answer',
    name: 'Two-Bar Question & Answer',
    category: 'melody',
    subdivision: '16n',
    description: 'A short opening question with a pause, followed by a broader answer in the second bar.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 8 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 8 }
    ]
  },
  {
    id: 'anticipated-bass',
    name: 'Anticipated Bass',
    category: 'bass',
    subdivision: '16n',
    description: 'A short pickup before the second bar resolves into a held bass note, followed by space.',
    steps: [
      { isNote: false, durationSteps: 14 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 6 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 4 }
    ]
  },
  {
    id: 'broken-eighths',
    name: 'Broken Eighths',
    category: 'melody',
    subdivision: '16n',
    description: 'An eighth-note pulse with deliberate gaps on beat two and the final offbeat.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 }
    ]
  },
  {
    id: 'sustained-phrase',
    name: 'Sustained Phrase',
    category: 'melody',
    subdivision: '16n',
    description: 'A half note followed by a dotted half note crossing the bar line, a quarter note, and a pause.',
    steps: [
      { isNote: true, durationSteps: 8 },
      { isNote: true, durationSteps: 12 },
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 8 }
    ]
  }
]
