import type { RhythmPreset } from '../../rhythm/types'

export const MELODY_RHYTHMS: readonly RhythmPreset[] = [
  {
    id: 'edm-anthem',
    name: 'EDM Anthem Lead',
    category: 'melody',
    subdivision: '16n',
    description: 'Hymn-like, festival anthem pattern designed for high-energy drops.',
    steps: [
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 }
    ]
  },
  {
    id: 'syncopated-lead',
    name: 'Syncopated Lead',
    category: 'melody',
    subdivision: '16n',
    description: 'Classic syncopated rhythm for emotional melodic hooks.',
    steps: [
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 6 }
    ]
  },
  {
    id: 'dotted-groove',
    name: 'Dotted Groove',
    category: 'melody',
    subdivision: '16n',
    description: 'Four dotted eighth notes followed by a quarter-note ending: 3+3+3+3+4.',
    steps: [
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 4 }
    ]
  },
  {
    id: 'pop-hook',
    name: 'Pop Hook',
    category: 'melody',
    subdivision: '16n',
    description: 'Catchy radio-friendly cadence balancing short notes with sustained accents.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 4 }
    ]
  },
  {
    id: 'aggressive-arp-lead',
    name: 'Broken Sixteenths',
    category: 'melody',
    subdivision: '16n',
    description: 'Short sixteenth-note entries alternate with eighth and quarter-note holds.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 4 }
    ]
  },
  {
    id: 'anxious-heartbeat',
    name: 'Paired Pulse',
    category: 'melody',
    subdivision: '16n',
    description: 'A dotted eighth and sixteenth pair followed by a quarter note, repeated twice.',
    steps: [
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 4 }
    ]
  },
  {
    id: 'basic-syncopation',
    name: 'Basic Syncopation',
    category: 'melody',
    subdivision: '16n',
    description: 'Lively off-beat syncopated accents for dynamic movement.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 }
    ]
  },
  {
    id: 'dark-lament',
    name: 'Dark Lament',
    category: 'melody',
    subdivision: '16n',
    description: 'A half note, dotted quarter, and closing eighth note for spacious melodic phrasing.',
    steps: [
      { isNote: true, durationSteps: 8 },
      { isNote: true, durationSteps: 6 },
      { isNote: true, durationSteps: 2 }
    ]
  },
  {
    id: 'fading-echo',
    name: 'Sparse Sustain',
    category: 'melody',
    subdivision: '16n',
    description: 'A quarter note followed by a sustained dotted half note; two hits per bar.',
    steps: [
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 12 }
    ]
  },
  {
    id: 'g-funk-whine',
    name: 'G-Funk Whine',
    category: 'melody',
    subdivision: '16n',
    description: 'Laid-back, soulful synth lead phrasing with a classic West Coast vibe.',
    steps: [
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 8 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 }
    ]
  },
  {
    id: 'minimalist-pulse',
    name: 'Minimalist Pulse',
    category: 'melody',
    subdivision: '16n',
    description: 'Clean, repetitive motif built from half and quarter notes.',
    steps: [
      { isNote: true, durationSteps: 8 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 4 }
    ]
  },
  {
    id: 'neurofunk-break',
    name: 'Neurofunk Break',
    category: 'melody',
    subdivision: '16n',
    description: 'Complex, high-energy syncopated break phrasing with terminal rest.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 }
    ]
  },
  {
    id: 'pop-ballad',
    name: 'Pop Ballad',
    category: 'melody',
    subdivision: '16n',
    description: 'Two eighth-note entries, a quarter-note pause, a held quarter note, and a closing pause.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 4 },
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 4 }
    ]
  },
  {
    id: 'post-rock-swell',
    name: 'Expanding Phrase',
    category: 'melody',
    subdivision: '16n',
    description: 'Two eighth notes followed by three quarter notes.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 4 }
    ]
  },
  {
    id: 'shuffle-groove',
    name: 'Dotted Eighth Groove',
    category: 'melody',
    subdivision: '16n',
    description: 'Dotted eighth and sixteenth pairs in a fixed 3:1 rhythm on the straight grid.',
    steps: [
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 }
    ]
  },
  {
    id: 'staccato-march',
    name: 'Staccato March',
    category: 'melody',
    subdivision: '16n',
    description: 'Short, punchy 16th burst resolved with an expectant rest.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 6 }
    ]
  },
  {
    id: 'wistful-sigh',
    name: 'Wistful Sigh',
    category: 'melody',
    subdivision: '16n',
    description: 'Melancholic, spacious phrasing with room for harmonic reflection.',
    steps: [
      { isNote: true, durationSteps: 8 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 }
    ]
  },
  {
    id: 'tension-arp',
    name: 'Tension Arp',
    category: 'melody',
    subdivision: '16n',
    description: 'Driving syncopated arpeggio sequence with a dramatic closing pause.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 4 }
    ]
  },
  {
    id: 'broken-scale',
    name: 'Broken Run',
    category: 'melody',
    subdivision: '16n',
    description: 'Mixed eighth and sixteenth-note entries with longer syncopated holds.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 4 }
    ]
  },
  {
    id: 'pushed-delay',
    name: 'Pushed Delay',
    category: 'melody',
    subdivision: '16n',
    description: 'Offbeat hits and syncopated pushes designed for stereo delay tails.',
    steps: [
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 3 }
    ]
  },
  {
    id: 'floating-fifths',
    name: 'Eighth Note Motif',
    category: 'melody',
    subdivision: '8n',
    description: 'Two eighth notes and a quarter note, repeated across the bar.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 }
    ]
  },
  {
    id: 'pentatonic-hook',
    name: 'Syncopated Hook',
    category: 'melody',
    subdivision: '16n',
    description: 'An eighth-note opening, two sixteenth notes, and a broad quarter-note ending.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 4 }
    ]
  }
]
