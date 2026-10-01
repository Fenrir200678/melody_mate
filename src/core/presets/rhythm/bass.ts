import type { RhythmPreset } from '../../rhythm/types'

export const BASS_RHYTHMS: readonly RhythmPreset[] = [
  {
    id: 'four-on-the-floor-bass',
    name: 'Quarter Note Bass',
    category: 'bass',
    subdivision: '16n',
    description: 'Four even quarter notes per bar for a steady bass pulse.',
    steps: [
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 4 }
    ]
  },
  {
    id: 'acid-bass',
    name: 'Acid 303 Line',
    category: 'bass',
    subdivision: '16n',
    description: 'Hypnotic, repetitive 16th-note sequence with intentional syncopated rests.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 4 }
    ]
  },
  {
    id: 'funk-slap',
    name: 'Funk Slap Bass',
    category: 'bass',
    subdivision: '16n',
    description: 'Syncopated 70s funk bassline with punchy 16th accents.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 2 }
    ]
  },
  {
    id: 'bossa-bass',
    name: 'Bossa Nova Bass',
    category: 'bass',
    subdivision: '16n',
    description: 'Smooth Brazilian dotted quarter and eighth note bass movement.',
    steps: [
      { isNote: true, durationSteps: 6 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 6 },
      { isNote: true, durationSteps: 2 }
    ]
  },
  {
    id: 'classic-house-bass',
    name: 'Offbeat Bass',
    category: 'bass',
    subdivision: '16n',
    description: 'An eighth-note rest before each offbeat eighth-note bass hit.',
    steps: [
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 }
    ]
  },
  {
    id: 'edm-pumping-bass',
    name: 'Bass With Closing Rest',
    category: 'bass',
    subdivision: '16n',
    description: 'Quarter, dotted quarter, and eighth-note entries followed by a quarter-note rest.',
    steps: [
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 6 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 4 }
    ]
  },
  {
    id: 'dubstep-drop',
    name: 'Half-Time Bass Break',
    category: 'bass',
    subdivision: '16n',
    description: 'A dense opening bass phrase followed by a quarter-note rest on beat four.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 4 }
    ]
  },
  {
    id: 'gothic-march',
    name: 'Gothic March',
    category: 'bass',
    subdivision: '16n',
    description: 'A slow, somber, and heavy procession anchoring darkwave compositions.',
    steps: [
      { isNote: true, durationSteps: 6 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 4 }
    ]
  },
  {
    id: 'metal-gallop',
    name: 'Metal Gallop',
    category: 'bass',
    subdivision: '16n',
    description: 'Fast-paced heavy metal rhythm (eighth note followed by two sixteenths).',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 }
    ]
  },
  {
    id: 'motown-groove',
    name: 'Motown Groove',
    category: 'bass',
    subdivision: '16n',
    description: 'Melodic, syncopated, and driving bassline in the style of classic Motown.',
    steps: [
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 }
    ]
  },
  {
    id: 'reggae-bass',
    name: 'Reggae Bass',
    category: 'bass',
    subdivision: '16n',
    description: 'Two syncopated three-note groups followed by a quarter-note breathing rest.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 4 }
    ]
  },
  {
    id: 'solemn-drone',
    name: 'Solemn Drone',
    category: 'bass',
    subdivision: '16n',
    description: 'Slow, minimalist pulse for deep, resonant, and atmospheric bass.',
    steps: [
      { isNote: true, durationSteps: 8 },
      { isNote: true, durationSteps: 8 }
    ]
  }
]
