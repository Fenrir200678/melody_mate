import type { RhythmPreset } from '../../rhythm/types'

export const DARK_MELODY_RHYTHMS: readonly RhythmPreset[] = [
  {
    id: 'ebm-command-lead',
    name: 'EBM Command Lead',
    category: 'melody',
    subdivision: '16n',
    description: 'A short opening pair and a spaced reply for an EBM-inspired lead over a busier bass sequence.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 6 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 }
    ]
  },
  {
    id: 'ebm-sequencer-lock',
    name: 'EBM Sequencer Lock',
    category: 'melody',
    subdivision: '16n',
    description: 'Three sixteenth-note entries and a rest on each of the first three beats, then a short closing hold.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 }
    ]
  },
  {
    id: 'dark-electro-interlock',
    name: 'Dark Electro Interlock',
    category: 'melody',
    subdivision: '16n',
    description: 'Displaced sixteenths and eighth-note holds weave around gaps for a dark electro lead.',
    steps: [
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 }
    ]
  },
  {
    id: 'dark-electro-burst-response',
    name: 'Dark Electro Burst & Response',
    category: 'melody',
    subdivision: '16n',
    description: 'A four-note burst leaves space for a more syncopated reply across a two-bar dark electro phrase.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 4 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 8 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 4 }
    ]
  },
  {
    id: 'dark-techno-three-step',
    name: 'Dark Techno Three-Step Sequence',
    category: 'melody',
    subdivision: '16n',
    description: 'Eighth-note entries separated by sixteenth rests shift across two bars before a short cycle reset.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 }
    ]
  },
  {
    id: 'dark-techno-sparse-stabs',
    name: 'Dark Techno Sparse Stabs',
    category: 'melody',
    subdivision: '16n',
    description:
      'A sixteenth-note stab just before beat two and another on the offbeat of three leave space for delay tails.',
    steps: [
      { isNote: false, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 6 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 5 }
    ]
  },
  {
    id: 'industrial-alarm',
    name: 'Industrial Alarm Motif',
    category: 'melody',
    subdivision: '16n',
    description: 'Two separated sixteenth hits lead to a quarter-note hold and a half-bar break.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 8 }
    ]
  },
  {
    id: 'synthpop-delayed-hook',
    name: 'Synthpop Delayed Hook',
    category: 'melody',
    subdivision: '16n',
    description:
      'An offbeat opening, a dotted-eighth/sixteenth figure, and a held third beat form a compact synthpop hook.',
    steps: [
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 4 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 }
    ]
  },
  {
    id: 'synthpop-call-return',
    name: 'Synthpop Call & Return',
    category: 'melody',
    subdivision: '16n',
    description: 'A brief first-bar call is answered after an offbeat entry with a longer second-bar ending.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 10 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 6 },
      { isNote: false, durationSteps: 2 }
    ]
  },
  {
    id: 'minimal-wave-grid',
    name: 'Minimal Wave Grid',
    category: 'melody',
    subdivision: '16n',
    description: 'Alternating eighth and sixteenth entries land on the beats, separated by deliberate gaps.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 3 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 3 }
    ]
  },
  {
    id: 'darkwave-longing',
    name: 'Darkwave Longing Phrase',
    category: 'melody',
    subdivision: '16n',
    description: 'Held notes and varied rests form a two-bar darkwave phrase with a delayed second-bar opening.',
    steps: [
      { isNote: true, durationSteps: 6 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 6 },
      { isNote: true, durationSteps: 6 },
      { isNote: true, durationSteps: 4 },
      { isNote: false, durationSteps: 4 }
    ]
  },
  {
    id: 'darksynth-chase',
    name: 'Darksynth Chase',
    category: 'melody',
    subdivision: '16n',
    description: 'A sixteenth-note opening run returns in shorter bursts with two eighth-note breathing gaps.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 }
    ]
  }
]
