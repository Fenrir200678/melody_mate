import type { RhythmPreset } from '../../rhythm/types'

export const GROOVE_BASS_RHYTHMS: readonly RhythmPreset[] = [
  {
    id: 'disco-pickup-bass',
    name: 'Disco Pickup Bass',
    category: 'bass',
    subdivision: '16n',
    description: 'Eighth-note motion with a sixteenth pickup before beat three and a short closing entry.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 }
    ]
  },
  {
    id: 'deep-house-pocket',
    name: 'Deep House Pocket',
    category: 'bass',
    subdivision: '16n',
    description: 'Offbeat eighth-note entries, a short push into beat three, and a late onbeat hit.',
    steps: [
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 }
    ]
  },
  {
    id: 'garage-skipping-bass',
    name: 'Garage Skipping Bass',
    category: 'bass',
    subdivision: '16n',
    description: 'Short isolated hits and eighth-note holds skip across the straight sixteenth grid.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 }
    ]
  },
  {
    id: 'funk-rest-pocket',
    name: 'Funk Rest Pocket',
    category: 'bass',
    subdivision: '16n',
    description: 'Short bass entries, eighth-note holds, and uneven gaps leave room for a funk groove.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 3 }
    ]
  },
  {
    id: 'hiphop-space-bass',
    name: 'Hip-Hop Space Bass',
    category: 'bass',
    subdivision: '16n',
    description: 'A dotted-eighth opening and two short later entries leave space for a hip-hop drum groove.',
    steps: [
      { isNote: true, durationSteps: 3 },
      { isNote: false, durationSteps: 5 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 }
    ]
  },
  {
    id: 'dnb-push-bass',
    name: 'Drum & Bass Push',
    category: 'bass',
    subdivision: '16n',
    description: 'Held dotted-eighth entries and short pushes alternate with gaps for a drum and bass phrase.',
    steps: [
      { isNote: true, durationSteps: 3 },
      { isNote: false, durationSteps: 3 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 3 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 3 }
    ]
  },
  {
    id: 'dub-answer-bass',
    name: 'Dub Answer Bass',
    category: 'bass',
    subdivision: '16n',
    description: 'A single first-bar quarter note leaves a long gap before a two-note second-bar answer.',
    steps: [
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 16 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 4 }
    ]
  },
  {
    id: 'indie-pulse-bass',
    name: 'Indie Pulse Bass',
    category: 'bass',
    subdivision: '16n',
    description: 'Quarter-note anchors alternate with an eighth-note entry, a gap, and a closing sixteenth pair.',
    steps: [
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 }
    ]
  }
]
