import type { RhythmPreset } from '../../rhythm/types'

export const DARK_BASS_RHYTHMS: readonly RhythmPreset[] = [
  {
    id: 'ebm-machine-pulse',
    name: 'EBM Machine Pulse',
    category: 'bass',
    subdivision: '16n',
    description:
      'Eight sixteenth-note hits on the eighth-note pulse, each followed by a sixteenth rest for a clipped EBM bass line.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 }
    ]
  },
  {
    id: 'ebm-body-drive',
    name: 'EBM Body Drive',
    category: 'bass',
    subdivision: '16n',
    description: 'EBM-inspired eighth and sixteenth cells with gaps and a three-note closing burst.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 }
    ]
  },
  {
    id: 'ebm-stomp-bass',
    name: 'EBM Stomp Bass',
    category: 'bass',
    subdivision: '16n',
    description: 'Short bass hits on each beat, with an extra sixteenth entry after beat four.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 }
    ]
  },
  {
    id: 'ebm-two-bar-turn',
    name: 'EBM Two-Bar Turn',
    category: 'bass',
    subdivision: '16n',
    description: 'A clipped eighth-note pulse opens into a held note, then a sixteenth turnaround in bar two.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 }
    ]
  },
  {
    id: 'dark-electro-broken-bass',
    name: 'Dark Electro Broken Bass',
    category: 'bass',
    subdivision: '16n',
    description: 'Uneven short entries and an eighth-note hold break up the pulse before a closing three-note burst.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 }
    ]
  },
  {
    id: 'dark-electro-double-strike',
    name: 'Dark Electro Double Strike',
    category: 'bass',
    subdivision: '16n',
    description: 'Paired sixteenths and isolated hits alternate with gaps for a dark electro bass sequence.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 }
    ]
  },
  {
    id: 'dark-techno-chug',
    name: 'Dark Techno Chug',
    category: 'bass',
    subdivision: '16n',
    description: 'Short bass entries at three-sixteenth intervals, resetting on beat three for a hypnotic techno cell.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 }
    ]
  },
  {
    id: 'dark-techno-displaced-bass',
    name: 'Dark Techno Displaced Bass',
    category: 'bass',
    subdivision: '16n',
    description:
      'Two identical half-bar cells leave beats one and three open, with short entries clustered around the offbeats.',
    steps: [
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 }
    ]
  },
  {
    id: 'industrial-stop-start',
    name: 'Industrial Stop-Start Bass',
    category: 'bass',
    subdivision: '16n',
    description: 'An opening sixteenth burst, a long break, and separated closing hits for an industrial bass riff.',
    steps: [
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 5 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: false, durationSteps: 3 }
    ]
  },
  {
    id: 'synthpop-push-bass',
    name: 'Synthpop Push Bass',
    category: 'bass',
    subdivision: '16n',
    description: 'Eighth-note movement with sixteenth gaps and a dotted-eighth ending for a synthpop bass hook.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 3 },
      { isNote: false, durationSteps: 1 }
    ]
  },
  {
    id: 'synthpop-two-bar-bass',
    name: 'Synthpop Two-Bar Bass',
    category: 'bass',
    subdivision: '16n',
    description: 'An eighth-note opening gives way to a gapped answer and a sixteenth pair in the second bar.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 3 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 1 },
      { isNote: true, durationSteps: 2 },
      { isNote: true, durationSteps: 2 }
    ]
  },
  {
    id: 'coldwave-sparse-bass',
    name: 'Coldwave Sparse Bass',
    category: 'bass',
    subdivision: '16n',
    description:
      'Three eighth-note bass hits with a long gap after the opening note for a restrained coldwave foundation.',
    steps: [
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 6 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 },
      { isNote: true, durationSteps: 2 },
      { isNote: false, durationSteps: 2 }
    ]
  }
]
