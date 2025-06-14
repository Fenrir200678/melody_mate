import type { WeightedRhythm } from '@/ts/types/rhythm.types'

export const WEIGHTED_RHYTHMS: WeightedRhythm[] = [
  {
    name: 'Anxious Heartbeat',
    category: 'melody',
    description: 'An uneven, tense, and emotional pulse',
    pattern: {
      steps: ['8n.', '16n', '4n', '8n.', '16n', '4n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['8n', '8n', '8n', '8n', '8n', '8n', '8n', '8n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['8n', '16n', '16n', '8n', '8n', '16n', '16n', '8n', '4n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['2n', '4n.', '8n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['8n.', '8n.', '8n.', '8n.', '8n.', '8n.', '8n.', '8n.', '8n.', '8n.'],
      subdivision: '16n'
    },
    degreeWeights: {
      '0': 2.0,
      '2': 1.8,
      '4': 2.0,
      '5': 1.5
    }
  },
  {
    name: 'Eighth Note Groove',
    category: 'melody',
    description: 'Smooth flowing melody',
    pattern: {
      steps: ['8n', '8n', '8n', '8n', '8n', '8n', '8n', '8n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['4n', '2n.'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['4n', '2n', '8n.', '16n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['4n.', '4n.', '4n'],
      subdivision: '16n'
    },
    degreeWeights: {
      '0': 2.0,
      '4': 1.8,
      '2': 1.6
    }
  },
  {
    name: 'Melancholic Synth Lead',
    category: 'melody',
    description: 'A classic syncopated lead for emotional synth-pop anthems',
    pattern: {
      steps: ['8n.', '16n', '4n', '8n', '4n.'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['2n', '4n', '4n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['16n', '16n', '8n', '16n', '16n', '16n', '16n', '4n', '8n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['8n', '8n', '8n', '8n', '4n', '4n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['8n', '8n', '4n', '4n', '2n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['8n.', '16n', '8n.', '16n', '8n.', '16n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['16n', '16n', '16n', '16n', '16n', '16n', '8n', '8n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['2n', '8n', '8n', '4n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['16n', '16n', '8n', '16n', '16n', '8n', '4n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['8n', '16n', '16n', '4n', '8n.', '16n', '4n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['4n', '16n', '8n.', '4n', '16n', '8n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['16n', '16n', '16n', '16n', '16n', '16n', '16n', '16n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['8n', '8n', '4n', '8n', '8n', '2n'],
      subdivision: '8n'
    },
    degreeWeights: {
      '0': 2.0,
      '4': 2.0
    }
  },
  {
    name: 'Pentatonic Hook',
    category: 'melody',
    description: 'Hooky and rhythmic pentatonic phrase',
    pattern: {
      steps: ['8n', '16n', '16n', '8n', '8n', '4n', '8n'],
      subdivision: '16n'
    },
    degreeWeights: {
      '0': 2.0,
      '2': 1.8,
      '4': 2.0,
      '5': 1.5
    }
  },
  {
    name: 'Acid Line',
    category: 'bass',
    description: 'A hypnotic, repetitive 16th-note pattern typical of Acid House.',
    pattern: {
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
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['4n.', '8n', '4n.', '8n'],
      subdivision: '16n'
    },
    degreeWeights: {
      '0': 2.0,
      '4': 1.8
    }
  },
  {
    name: 'Disco Octaves',
    category: 'bass',
    description: 'The quintessential driving octave-jumping bassline from the disco era.',
    pattern: {
      steps: ['8n', '8n', '8n', '8n', '8n', '8n', '8n', '8n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['8n', '16n', '16n', '8n.', '16n', '8n', '8n'],
      subdivision: '16n'
    },
    degreeWeights: {
      '0': 2.0,
      '4': 1.8
    }
  },
  {
    name: 'Four on the Floor',
    category: 'bass',
    description: 'Classic steady bass pulse',
    pattern: {
      steps: ['4n', '4n', '4n', '4n'],
      subdivision: '16n'
    },
    degreeWeights: {
      '0': 2.0,
      '4': 1.8
    }
  },
  {
    name: 'Gothic March',
    category: 'bass',
    description: 'A slow, somber, and heavy procession',
    pattern: {
      steps: ['4n.', '8n', '4n', '4n'],
      subdivision: '16n'
    },
    degreeWeights: {
      '0': 2.0,
      '4': 1.6
    }
  },
  {
    name: 'Metal Gallop',
    category: 'bass',
    description: 'Iconic fast-paced heavy metal rhythm',
    pattern: {
      steps: ['8n', '16n', '16n', '8n', '16n', '16n', '4n'],
      subdivision: '16n'
    },
    degreeWeights: {
      '0': 2.0,
      '4': 1.8
    }
  },
  {
    name: 'Motown Groove',
    category: 'bass',
    description: 'A melodic, syncopated, and driving bassline in the style of classic Motown.',
    pattern: {
      steps: ['8n.', '16n', '8n', '8n', '4n', '8n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['8n', '8n.', '16n', '8n', '8n.', '16n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['16n', '16n', '16n', '16n', '16n', '16n', '16n', '16n'],
      subdivision: '16n'
    },
    degreeWeights: {
      '0': 2.0,
      '4': 1.8
    }
  },
  {
    name: 'Retro Funk Bass',
    category: 'bass',
    description: 'A groovy, syncopated bassline straight from the 80s',
    pattern: {
      steps: ['8n', '16n', '16n', '4n', '8n', '4n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['2n', '2n'],
      subdivision: '16n'
    },
    degreeWeights: {
      '0': 2.0,
      '4': 1.5
    }
  },
  {
    name: 'Walking Bass',
    category: 'bass',
    description: 'Jazz walking pattern',
    pattern: {
      steps: ['4n', '4n', '4n', '4n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['8n.', '16n', '8n', '4n', '8n', '4n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['8n', '4n', '8n', '8n', '4n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['8n', '8n', '8n', '16n', '16n', '8n', '8n'],
      subdivision: '16n'
    },
    degreeWeights: {
      '0': 2.0,
      '3': 1.6,
      '4': 1.8
    }
  },
  {
    name: 'Clav\u00e9 Son (3-2)',
    category: 'world',
    description: 'Cuban son clave',
    pattern: {
      steps: ['8n.', '8n.', '4n', '8n', '8n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['4n.', '8n', '2n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['8n', '16n', '16n', '8n', '8n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['4n', '8n', '8n', '4n', '8n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['8n.', '16n', '8n', '8n.', '16n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['16n', '8n', '16n', '8n', '16n', '8n', '8n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['8n', '16n', '16n', '8n', '8n', '4n'],
      subdivision: '16n'
    },
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
    pattern: {
      steps: ['8n.', '8n.', '4n'],
      subdivision: '16n'
    },
    degreeWeights: {
      '0': 2.0,
      '3': 1.6,
      '4': 1.8
    }
  }
]
