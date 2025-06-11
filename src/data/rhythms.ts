import type { CategorizedRhythm } from '@/ts/types/rhythm.types'

export const PREDEFINED_RHYTHMS: CategorizedRhythm[] = [
  // === MELODY ===
  {
    name: 'Anxious Heartbeat',
    category: 'melody',
    description: 'An uneven, tense, and emotional pulse',
    pattern: { steps: ['8n.', '16n', '4n', '8n.', '16n', '4n'] }
  },
  {
    name: 'Arpeggiated Flow',
    category: 'melody',
    description: 'Flowing arpeggiated melody',
    pattern: { steps: ['16n', '16n', '16n', '16n', '8n', '8n', '4n'] }
  },
  {
    name: 'Basic Syncopation',
    category: 'melody',
    description: 'Off-beat accents',
    pattern: { steps: ['8n', '16n', '16n', '8n', '8n', '16n', '16n', '8n', '4n'] }
  },
  {
    name: 'Dark Lament',
    category: 'melody',
    description: 'A slow, mournful, and spacious emotional expression',
    pattern: { steps: ['2n', '4n.', '8n'] }
  },
  {
    name: 'Eighth Note Groove',
    category: 'melody',
    description: 'Smooth flowing melody',
    pattern: { steps: ['8n', '8n', '8n', '8n', '8n', '8n', '8n', '8n'] }
  },
  {
    name: 'Fading Echo',
    category: 'melody',
    description: 'A sparse, decaying rhythm creating a sense of loss and emptiness',
    pattern: { steps: ['4n', '2n.'] }
  },
  {
    name: 'G-Funk Whine',
    category: 'melody',
    description: 'A laid-back, whiny synth lead with a classic West Coast vibe',
    pattern: { steps: ['4n', '2n', '8n.', '16n'] }
  },
  {
    name: 'Legato Waves',
    category: 'melody',
    description: 'Smooth connected notes',
    pattern: { steps: ['4n.', '4n.', '4n'] }
  },
  {
    name: 'Melancholic Synth Lead',
    category: 'melody',
    description: 'A classic syncopated lead for emotional synth-pop anthems',
    pattern: { steps: ['8n.', '16n', '4n', '8n', '4n.'] }
  },
  {
    name: 'Minimalist Pulse',
    category: 'melody',
    description: 'Simple repetitive pattern',
    pattern: { steps: ['2n', '4n', '4n'] }
  },
  {
    name: 'Neurofunk Break',
    category: 'melody',
    description: 'A complex, syncopated, and high-energy electronic rhythm',
    pattern: { steps: ['16n', '16n', '8n', '16n', '16n', '16n', '16n', '4n', '8n'] }
  },
  {
    name: 'Pop Ballad',
    category: 'melody',
    description: 'Emotional pop progression',
    pattern: { steps: ['8n', '8n', '8n', '8n', '4n', '4n'] }
  },
  {
    name: 'Post-Rock Swell',
    category: 'melody',
    description: 'A building, emotional rhythm that grows in intensity',
    pattern: { steps: ['8n', '8n', '4n', '4n', '2n'] }
  },
  {
    name: 'Shuffle Groove',
    category: 'melody',
    description: 'Swung triplet feel',
    pattern: { steps: ['8n.', '16n', '8n.', '16n', '8n.', '16n'] }
  },
  {
    name: 'Staccato March',
    category: 'melody',
    description: 'Short, punchy notes',
    pattern: { steps: ['16n', '16n', '16n', '16n', '16n', '16n', '8n', '8n'] }
  },
  {
    name: 'Wistful Sigh',
    category: 'melody',
    description: 'A slow, melancholic pattern with space for reflection',
    pattern: { steps: ['2n', '8n', '8n', '4n'] }
  },

  // === BASS ===
  {
    name: 'Bossa Nova Bass',
    category: 'bass',
    description: 'Smooth Brazilian bass line',
    pattern: { steps: ['4n.', '8n', '4n.', '8n'] }
  },
  {
    name: 'Dubstep Drop',
    category: 'bass',
    description: 'Heavy syncopated dubstep like',
    pattern: { steps: ['8n', '16n', '16n', '8n.', '16n', '8n', '8n'] }
  },
  {
    name: 'Four on the Floor',
    category: 'bass',
    description: 'Classic steady bass pulse',
    pattern: { steps: ['4n', '4n', '4n', '4n'] }
  },
  {
    name: 'Gothic March',
    category: 'bass',
    description: 'A slow, somber, and heavy procession',
    pattern: { steps: ['4n.', '8n', '4n', '4n'] }
  },
  {
    name: 'Metal Gallop',
    category: 'bass',
    description: 'Iconic fast-paced heavy metal rhythm',
    pattern: { steps: ['8n', '16n', '16n', '8n', '16n', '16n', '4n'] }
  },
  {
    name: 'Reggae Bass',
    category: 'bass',
    description: 'Offbeat reggae groove',
    pattern: { steps: ['8n', '8n.', '16n', '8n', '8n.', '16n'] }
  },
  {
    name: 'Rolling Bass',
    category: 'bass',
    description: 'A rolling, syncopated bassline',
    pattern: { steps: ['16n', '16n', '16n', '16n', '16n', '16n', '16n', '16n'] }
  },
  {
    name: 'Retro Funk Bass',
    category: 'bass',
    description: 'A groovy, syncopated bassline straight from the 80s',
    pattern: { steps: ['8n', '16n', '16n', '4n', '8n', '4n'] }
  },
  {
    name: 'Solemn Drone',
    category: 'bass',
    description: 'A slow, minimalist pulse for deep and somber basslines',
    pattern: { steps: ['2n', '2n'] }
  },
  {
    name: 'Walking Bass',
    category: 'bass',
    description: 'Jazz walking pattern',
    pattern: { steps: ['4n', '4n', '4n', '4n'] }
  },

  // === WORLD ===
  {
    name: 'Arabic Maqsum',
    category: 'world',
    description: 'Middle Eastern rhythm',
    pattern: { steps: ['8n', '4n', '8n', '8n', '4n'] }
  },
  {
    name: 'Balkan Rhythm',
    category: 'world',
    description: 'Eastern European odd meter',
    pattern: { steps: ['8n', '8n', '8n', '16n', '16n', '8n', '8n'] }
  },
  {
    name: 'Clavé Son (3-2)',
    category: 'world',
    description: 'Cuban son clave',
    pattern: { steps: ['8n.', '8n.', '4n', '8n', '8n'] }
  },
  {
    name: 'Habanera',
    category: 'world',
    description: 'Spanish dance rhythm',
    pattern: { steps: ['8n', '16n', '16n', '8n', '8n'] }
  },
  {
    name: 'Indian Tala',
    category: 'world',
    description: 'Classical Indian rhythm',
    pattern: { steps: ['4n', '8n', '8n', '4n', '8n'] }
  },
  {
    name: 'Rumba Clave',
    category: 'world',
    description: 'Afro-Cuban clave pattern',
    pattern: { steps: ['8n.', '16n', '8n', '8n.', '16n'] }
  },
  {
    name: 'Samba Groove',
    category: 'world',
    description: 'Brazilian carnival rhythm',
    pattern: { steps: ['16n', '8n', '16n', '8n', '16n', '8n', '8n'] }
  },
  {
    name: 'The Tresillo',
    category: 'world',
    description: 'Cuban rhythm pattern',
    pattern: { steps: ['8n.', '8n.', '4n'] }
  }
]
