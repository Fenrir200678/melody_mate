import type { RhythmPattern } from '@/ts/models';

export const RHYTHMIC_LICKS: RhythmPattern[] = [
  {
    name: 'Gallop',
    steps: ['8n', '16n', '16n'],
  },
  {
    name: 'Triplet Burst',
    steps: ['8t', '8t', '8t'], // Assuming 8t is a valid duration for triplets
  },
  {
    name: 'Syncopated Skip',
    steps: ['16n', '8n', '16n'],
  },
  {
    name: 'Dotted Flow',
    steps: ['8n.', '16n'],
  },
  {
    name: 'Quick Double',
    steps: ['16n', '16n'],
  },
];
