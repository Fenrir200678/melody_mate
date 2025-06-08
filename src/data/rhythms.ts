import type { RhythmPattern } from '@/models/Rhythm'

export const PREDEFINED_RHYTHMS: { name: string; pattern: RhythmPattern }[] = [
  {
    name: 'Four on the Floor',
    pattern: {
      steps: ['4n', '4n', '4n', '4n']
    }
  },
  {
    name: 'Eighth Note Groove',
    pattern: {
      steps: ['8n', '8n', '8n', '8n', '8n', '8n', '8n', '8n']
    }
  },
  {
    name: 'The Tresillo', // E(3, 8)
    pattern: {
      steps: ['8n.', '8n.', '4n']
    }
  },
  {
    name: 'Basic Syncopation',
    pattern: {
      steps: ['8n', '16n', '16n', '8n', '8n', '16n', '16n', '8n', '4n']
    }
  },
  {
    name: 'Funky Drummer',
    pattern: {
      steps: ['16n', '16n', '8n', '16n', '16n', '8n', '16n', '16n', '8n', '8n']
    }
  },
  {
    name: 'Bossa Nova Bass',
    pattern: {
      steps: ['4n.', '8n', '4n.', '8n'] // Simplified
    }
  },
  {
    name: 'Habanera',
    pattern: {
      steps: ['8n', '16n', '16n', '8n', '8n']
    }
  },
  {
    name: 'Clavé Son (3-2)',
    pattern: {
      steps: ['8n.', '8n.', '4n', '8n', '8n']
    }
  },
  {
    name: 'Pop Ballad',
    pattern: {
      steps: ['8n', '8n', '8n', '8n', '4n', '4n']
    }
  }
]
