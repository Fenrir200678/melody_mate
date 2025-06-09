import type { RhythmPattern } from '@/models/Rhythm'

export type RhythmCategory = 'bass' | 'melody' | 'world'

export type CategorizedRhythm = {
  name: string
  pattern: RhythmPattern
  category: RhythmCategory
  description?: string
}

export const RHYTHM_CATEGORIES = {
  bass: 'Bass Patterns',
  melody: 'Melody Patterns',
  world: 'World Music'
} as const

export const PREDEFINED_RHYTHMS: CategorizedRhythm[] = [
  // === BASS PATTERNS ===
  {
    name: 'Four on the Floor',
    category: 'bass',
    description: 'Classic steady bass pulse',
    pattern: {
      steps: ['4n', '4n', '4n', '4n']
    }
  },
  {
    name: 'Bossa Nova Bass',
    category: 'bass',
    description: 'Smooth Brazilian bass line',
    pattern: {
      steps: ['4n.', '8n', '4n.', '8n']
    }
  },
  {
    name: 'Reggae Bass',
    category: 'bass',
    description: 'Offbeat reggae groove',
    pattern: {
      steps: ['8n', '8n.', '16n', '8n', '8n.', '16n']
    }
  },
  {
    name: 'Walking Bass',
    category: 'bass',
    description: 'Jazz walking pattern',
    pattern: {
      steps: ['4n', '4n', '4n', '4n']
    }
  },
  {
    name: 'Dubstep Drop',
    category: 'bass',
    description: 'Heavy syncopated dubstep',
    pattern: {
      steps: ['8n', '16n', '16n', '8n.', '16n', '8n', '8n']
    }
  },

  // === MELODY PATTERNS ===
  {
    name: 'Eighth Note Groove',
    category: 'melody',
    description: 'Smooth flowing melody',
    pattern: {
      steps: ['8n', '8n', '8n', '8n', '8n', '8n', '8n', '8n']
    }
  },
  {
    name: 'Pop Ballad',
    category: 'melody',
    description: 'Emotional pop progression',
    pattern: {
      steps: ['8n', '8n', '8n', '8n', '4n', '4n']
    }
  },
  {
    name: 'Arpeggiated Flow',
    category: 'melody',
    description: 'Flowing arpeggiated melody',
    pattern: {
      steps: ['16n', '16n', '16n', '16n', '8n', '8n', '4n']
    }
  },
  {
    name: 'Staccato March',
    category: 'melody',
    description: 'Short, punchy notes',
    pattern: {
      steps: ['16n', '16n', '16n', '16n', '16n', '16n', '8n', '8n']
    }
  },
  {
    name: 'Legato Waves',
    category: 'melody',
    description: 'Smooth connected notes',
    pattern: {
      steps: ['4n.', '4n.', '4n']
    }
  },
  {
    name: 'Minimalist Pulse',
    category: 'melody',
    description: 'Simple repetitive pattern',
    pattern: {
      steps: ['2n', '4n', '4n']
    }
  },
  {
    name: 'Basic Syncopation',
    category: 'melody',
    description: 'Off-beat accents',
    pattern: {
      steps: ['8n', '16n', '16n', '8n', '8n', '16n', '16n', '8n', '4n']
    }
  },
  {
    name: 'Shuffle Groove',
    category: 'melody',
    description: 'Swung triplet feel',
    pattern: {
      steps: ['8n.', '16n', '8n.', '16n', '8n.', '16n']
    }
  },

  // === WORLD MUSIC ===
  {
    name: 'The Tresillo',
    category: 'world',
    description: 'Cuban rhythm pattern',
    pattern: {
      steps: ['8n.', '8n.', '4n']
    }
  },
  {
    name: 'Habanera',
    category: 'world',
    description: 'Spanish dance rhythm',
    pattern: {
      steps: ['8n', '16n', '16n', '8n', '8n']
    }
  },
  {
    name: 'Clavé Son (3-2)',
    category: 'world',
    description: 'Cuban son clave',
    pattern: {
      steps: ['8n.', '8n.', '4n', '8n', '8n']
    }
  },
  {
    name: 'Samba Groove',
    category: 'world',
    description: 'Brazilian carnival rhythm',
    pattern: {
      steps: ['16n', '8n', '16n', '8n', '16n', '8n', '8n']
    }
  },
  {
    name: 'Rumba Clave',
    category: 'world',
    description: 'Afro-Cuban clave pattern',
    pattern: {
      steps: ['8n.', '16n', '8n', '8n.', '16n']
    }
  },
  {
    name: 'Balkan Rhythm',
    category: 'world',
    description: 'Eastern European odd meter',
    pattern: {
      steps: ['8n', '8n', '8n', '16n', '16n', '8n', '8n']
    }
  },
  {
    name: 'Indian Tala',
    category: 'world',
    description: 'Classical Indian rhythm',
    pattern: {
      steps: ['4n', '8n', '8n', '4n', '8n']
    }
  },
  {
    name: 'Arabic Maqsum',
    category: 'world',
    description: 'Middle Eastern rhythm',
    pattern: {
      steps: ['8n', '4n', '8n', '8n', '4n']
    }
  }
]

// Legacy export for backward compatibility
export const PREDEFINED_RHYTHMS_LEGACY = PREDEFINED_RHYTHMS.map((rhythm) => ({
  name: rhythm.name,
  pattern: rhythm.pattern
}))
