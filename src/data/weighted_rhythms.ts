import type { WeightedRhythm } from '@/ts/types/rhythm.types'

export const WEIGHTED_RHYTHMS: WeightedRhythm[] = [
  // Melody
  {
    name: 'A Melancholic Synth Lead',
    category: 'melody',
    description: 'A classic syncopated lead for emotional synth-pop anthems',
    steps: ['8n.', '16n', '4n', '8n', '4n.'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.8,
      '2': 1.6
    }
  },
  {
    name: 'Aggressive Arp Lead',
    category: 'melody',
    description: 'Short, percussive arpeggio pattern with a dissonant feel',
    steps: ['16n', '8n', '16n', '4n', '16n', '8n', '16n', '4n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '2': 1.6,
      '6': 1.8
    }
  },
  {
    name: 'Anxious Heartbeat',
    category: 'melody',
    description: 'An uneven, tense, and emotional pulse',
    steps: ['8n.', '16n', '4n', '8n.', '16n', '4n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 1.5,
      '3': 1.4,
      '6': 1.8
    }
  },
  {
    name: 'Arpeggiated Flow',
    category: 'melody',
    description: 'Flowing arpeggiated melody',
    steps: ['8n', '8n', '8n', '8n', '8n', '8n', '8n', '8n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '2': 1.6,
      '4': 1.8
    }
  },
  {
    name: 'Basic Syncopation',
    category: 'melody',
    description: 'Off-beat accents',
    steps: ['8n', '16n', '16n', '8n', '8n', '16n', '16n', '8n', '4n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '2': 1.8,
      '4': 2.0,
      '5': 1.5
    }
  },
  {
    name: 'Dark Lament',
    category: 'melody',
    description: 'A slow, mournful, and spacious emotional expression',
    steps: ['2n', '4n.', '8n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '2': 1.8,
      '3': 1.6
    }
  },
  {
    name: 'Dotted 8th Note Syncopation',
    category: 'melody',
    description: 'Syncopated rhythm with dotted 8th notes',
    steps: ['8n.', '8n.', '8n.', '8n.', '8n.', '8n.', '8n.', '8n.', '8n.', '8n.'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '2': 1.8,
      '4': 2.0,
      '5': 1.5
    }
  },
  {
    name: 'EDM Anthem Lead',
    category: 'melody',
    description: 'A hymn-like, catchy lead melody for an energetic EDM drop.',
    steps: ['8n.', '16n', '8n', '8n.', '16n', '8n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '2': 1.8,
      '4': 1.8
    }
  },
  {
    name: 'Eighth Note Groove',
    category: 'melody',
    description: 'Smooth flowing melody',
    steps: ['8n', '8n', '8n', '8n', '8n', '8n', '8n', '8n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.8,
      '2': 1.6
    }
  },
  {
    name: 'Fading Echo',
    category: 'melody',
    description: 'A sparse, decaying rhythm creating a sense of loss and emptiness',
    steps: ['4n', '2n.'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.8,
      '2': 1.6
    }
  },
  {
    name: 'G-Funk Whine',
    category: 'melody',
    description: 'A laid-back, whiny synth lead with a classic West Coast vibe',
    steps: ['4n', '2n', '8n.', '16n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '2': 1.8,
      '4': 2.0,
      '5': 1.5
    }
  },
  {
    name: 'Legato Waves',
    category: 'melody',
    description: 'Smooth connected notes',
    steps: ['4n.', '4n.', '4n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.8,
      '2': 1.6
    }
  },
  {
    name: 'Minimalist Pulse',
    category: 'melody',
    description: 'Simple repetitive pattern',
    steps: ['2n', '4n', '4n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '2': 1.8,
      '4': 1.8
    }
  },
  {
    name: 'Neurofunk Break',
    category: 'melody',
    description: 'A complex, syncopated, and high-energy electronic rhythm',
    steps: ['16n', '16n', '8n', '16n', '16n', '16n', '16n', '4n', '8n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '2': 1.8,
      '4': 2.0,
      '5': 1.5
    }
  },
  {
    name: 'Pop Ballad',
    category: 'melody',
    description: 'Emotional pop progression',
    steps: ['8n', '8n', '8n', '8n', '4n', '4n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.8,
      '2': 1.6
    }
  },
  {
    name: 'Post-Rock Swell',
    category: 'melody',
    description: 'A building, emotional rhythm that grows in intensity',
    steps: ['8n', '8n', '4n', '4n', '2n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.8,
      '2': 1.6
    }
  },
  {
    name: 'Shuffle Groove',
    category: 'melody',
    description: 'Swung triplet feel',
    steps: ['8n.', '16n', '8n.', '16n', '8n.', '16n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.8,
      '2': 1.6
    }
  },
  {
    name: 'Staccato March',
    category: 'melody',
    description: 'Short, punchy notes',
    steps: ['16n', '16n', '16n', '16n', '16n', '16n', '8n', '8n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.8,
      '2': 1.6
    }
  },
  {
    name: 'Wistful Sigh',
    category: 'melody',
    description: 'A slow, melancholic pattern with space for reflection',
    steps: ['2n', '8n', '8n', '4n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 1.7,
      '1': 1.4,
      '5': 1.3,
      '6': 1.8
    }
  },
  {
    name: 'Tension Arp',
    category: 'melody',
    description: 'Driving 16th-note arpeggio with slight syncopation',
    steps: ['16n', '16n', '8n', '16n', '16n', '8n', '4n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.8,
      '2': 1.6
    }
  },
  {
    name: 'Broken Scale',
    category: 'melody',
    description: 'Minor scale run with pauses and jumps',
    steps: ['8n', '16n', '16n', '4n', '8n.', '16n', '4n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.8,
      '2': 1.6
    }
  },
  {
    name: 'Pushed Delay',
    category: 'melody',
    description: 'Late hits with deliberate gaps',
    steps: ['4n', '16n', '8n.', '4n', '16n', '8n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.8,
      '2': 1.6
    }
  },
  {
    name: 'Tense Ostinato',
    category: 'melody',
    description: 'Tense, meandering sequence with rhythmic consistency',
    steps: ['16n', '16n', '16n', '16n', '16n', '16n', '16n', '16n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 1.2,
      '1': 1.0,
      '2': 1.0,
      '3': 1.1,
      '4': 1.2,
      '5': 1.0,
      '6': 1.1
    }
  },
  {
    name: 'Floating Fifths',
    category: 'melody',
    description: 'Levitating, slow-moving interval-based line',
    steps: ['8n', '8n', '4n', '8n', '8n', '2n'],
    subdivision: '8n',
    degreeWeights: {
      '0': 2.0,
      '4': 2.0
    }
  },
  {
    name: 'Pentatonic Hook',
    category: 'melody',
    description: 'Hooky and rhythmic pentatonic phrase',
    steps: ['8n', '16n', '16n', '8n', '8n', '4n', '8n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '2': 1.8,
      '4': 2.0,
      '5': 1.5
    }
  },

  // Bass

  {
    name: 'Acid Line',
    category: 'bass',
    description: 'A hypnotic, repetitive 16th-note pattern typical of Acid House.',
    steps: [
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n'
    ],
    subdivision: '16n',
    // Weights create a minor/modal feel, common in acid lines.
    degreeWeights: {
      '0': 2.0,
      '2': 1.8,
      '3': 1.5,
      '4': 1.6
    }
  },
  {
    name: 'Bossa Nova Bass',
    category: 'bass',
    description: 'Smooth Brazilian bass line',
    steps: ['4n.', '8n', '4n.', '8n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.8
    }
  },
  {
    name: 'Classic House Bass',
    category: 'bass',
    description: 'A typical off-beat bassline for House, creating a driving and funky groove.',
    steps: ['8n', '4n', '8n', '4n', '8n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '2': 1.5,
      '4': 1.8,
      '6': 1.4
    }
  },
  {
    name: 'EBM Sequencer Bass',
    category: 'bass',
    description: 'A driving, relentless 16th-note sequencer bassline, the foundation of EBM.',
    steps: [
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n',
      '16n'
    ],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '3': 1.4,
      '4': 1.6
    }
  },
  {
    name: 'EDM Pumping Bass',
    category: 'bass',
    description: 'A typical EDM bassline that creates a pumping, rhythmic pulse in the drop.',
    steps: ['4n', '4n.', '8n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 3.0,
      '4': 1.1
    }
  },
  {
    name: 'Disco Octaves',
    category: 'bass',
    description: 'The quintessential driving octave-jumping bassline from the disco era.',
    steps: ['8n', '8n', '8n', '8n', '8n', '8n', '8n', '8n'],
    subdivision: '16n',
    // Heavily weighted on the root note to simulate the classic octave pattern.
    degreeWeights: {
      '0': 3.0,
      '4': 1.2
    }
  },
  {
    name: 'Dubstep Drop',
    category: 'bass',
    description: 'Heavy syncopated dubstep like',
    steps: ['8n', '16n', '16n', '8n.', '16n', '8n', '8n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.8
    }
  },
  {
    name: 'Four on the Floor',
    category: 'bass',
    description: 'Classic steady bass pulse',
    steps: ['4n', '4n', '4n', '4n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.8
    }
  },
  {
    name: 'Gothic March',
    category: 'bass',
    description: 'A slow, somber, and heavy procession',
    steps: ['4n.', '8n', '4n', '4n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.6
    }
  },
  {
    name: 'Metal Gallop',
    category: 'bass',
    description: 'Iconic fast-paced heavy metal rhythm',
    steps: ['8n', '16n', '16n', '8n', '16n', '16n', '4n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.8
    }
  },
  {
    name: 'Motown Groove',
    category: 'bass',
    description: 'A melodic, syncopated, and driving bassline in the style of classic Motown.',
    steps: ['8n.', '16n', '8n', '8n', '4n', '8n'],
    subdivision: '16n',
    // Weights emphasize the full chord (1-3-5) plus the leading tone (6) for melodic fills.
    degreeWeights: {
      '0': 2.0,
      '2': 1.6,
      '4': 1.8,
      '6': 1.2
    }
  },
  {
    name: 'Reggae Bass',
    category: 'bass',
    description: 'Offbeat reggae groove',
    steps: ['8n', '8n.', '16n', '8n', '8n.', '16n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.8,
      '2': 1.6
    }
  },
  {
    name: 'Rolling Bass',
    category: 'bass',
    description: 'A rolling, syncopated bassline',
    steps: ['16n', '16n', '16n', '16n', '16n', '16n', '16n', '16n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.8
    }
  },
  {
    name: 'Retro Funk Bass',
    category: 'bass',
    description: 'A groovy, syncopated bassline straight from the 80s',
    steps: ['8n', '16n', '16n', '4n', '8n', '4n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '2': 1.8,
      '4': 2.0,
      '5': 1.5
    }
  },
  {
    name: 'Solemn Drone',
    category: 'bass',
    description: 'A slow, minimalist pulse for deep and somber basslines',
    steps: ['2n', '2n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.5
    }
  },
  {
    name: 'Walking Bass',
    category: 'bass',
    description: 'Jazz walking pattern',
    steps: ['4n', '4n', '4n', '4n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '4': 1.8,
      '2': 1.4
    }
  },
  {
    name: 'African Bell Pattern',
    category: 'world',
    description: 'A foundational 12/8 bell pattern from West Africa, creating a polyrhythmic feel.',
    steps: ['8n.', '16n', '8n', '4n', '8n', '4n'],
    subdivision: '16n',
    // Generic "world" weights focusing on root, fourth, and fifth to avoid Western bias.
    degreeWeights: {
      '0': 2.0,
      '3': 1.6,
      '4': 1.8
    }
  },
  {
    name: 'Arabic Maqsum',
    category: 'world',
    description: 'Middle Eastern rhythm',
    steps: ['8n', '4n', '8n', '8n', '4n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '3': 1.6,
      '4': 1.8
    }
  },
  {
    name: 'Balkan Rhythm',
    category: 'world',
    description: 'Eastern European odd meter',
    steps: ['8n', '8n', '8n', '16n', '16n', '8n', '8n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '3': 1.6,
      '4': 1.8
    }
  },
  {
    name: 'Clavé Son (3-2)',
    category: 'world',
    description: 'Cuban son clave',
    steps: ['8n.', '8n.', '4n', '8n', '8n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '3': 1.6,
      '4': 1.8
    }
  },
  {
    name: 'Gamelan Core Melody',
    category: 'world',
    description: 'A steady, meditative core pattern based on Indonesian Gamelan music.',
    steps: ['4n.', '8n', '2n'],
    subdivision: '16n',
    // Weights simulate a pentatonic (5-note) scale by only favoring degrees 1, 2, 3, 5, 6.
    degreeWeights: {
      '0': 1.5,
      '1': 1.5,
      '2': 1.5,
      '4': 1.5,
      '5': 1.5
    }
  },
  {
    name: 'Habanera',
    category: 'world',
    description: 'Spanish dance rhythm',
    steps: ['8n', '16n', '16n', '8n', '8n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '3': 1.6,
      '4': 1.8
    }
  },
  {
    name: 'Indian Tala',
    category: 'world',
    description: 'Classical Indian rhythm',
    steps: ['4n', '8n', '8n', '4n', '8n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '3': 1.6,
      '4': 1.8
    }
  },
  {
    name: 'Rumba Clave',
    category: 'world',
    description: 'Afro-Cuban clave pattern',
    steps: ['8n.', '16n', '8n', '8n.', '16n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '3': 1.6,
      '4': 1.8
    }
  },
  {
    name: 'Samba Groove',
    category: 'world',
    description: 'Brazilian carnival rhythm',
    steps: ['16n', '8n', '16n', '8n', '16n', '8n', '8n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '3': 1.6,
      '4': 1.8
    }
  },
  {
    name: 'Tango Rhythm',
    category: 'world',
    description: 'The dramatic and passionate rhythmic cell characteristic of Argentinian Tango.',
    steps: ['8n', '16n', '16n', '8n', '8n', '4n'],
    subdivision: '16n',
    // Weights emphasize a minor tonality with the leading tone for dramatic tension.
    degreeWeights: {
      '0': 2.0,
      '2': 1.8,
      '4': 1.7,
      '6': 1.5
    }
  },
  {
    name: 'The Tresillo',
    category: 'world',
    description: 'Cuban rhythm pattern',
    steps: ['8n.', '8n.', '4n'],
    subdivision: '16n',
    degreeWeights: {
      '0': 2.0,
      '3': 1.6,
      '4': 1.8
    }
  }
]
