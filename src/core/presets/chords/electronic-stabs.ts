import { STEPS_PER_BAR } from '../../schemas/project.schema'
import type { PredefinedProgression, PresetChordQuality } from '../../theory/progressions.types'

type Harmony = readonly [degree: number, roman: string, quality: PresetChordQuality]
type Hit = readonly [step: number, durationSteps: number]

function stabs(harmony: readonly Harmony[], rhythm: readonly Hit[]): PredefinedProgression['chords'] {
  return harmony.flatMap(([degree, roman, quality], bar) =>
    rhythm.map(([step, durationSteps]) => ({
      degree,
      roman,
      quality,
      startBar: bar + step / STEPS_PER_BAR,
      durationBars: durationSteps / STEPS_PER_BAR
    }))
  )
}

export const ELECTRONIC_STAB_PROGRESSIONS: readonly PredefinedProgression[] = [
  {
    id: 'dub-techno-two-stabs',
    name: 'Dub Techno Sparse Stabs',
    category: 'electronic',
    subgenre: 'Dub Techno',
    scale: 'minor',
    bars: 4,
    chords: stabs(
      [
        [0, 'i', 'minor7'],
        [0, 'i', 'minor7'],
        [3, 'iv', 'minor7'],
        [3, 'iv', 'minor7']
      ],
      [
        [2, 1],
        [10, 1]
      ]
    ),
    description: 'Two short offbeat minor-seventh hits per bar; long rests leave room for dub delay tails.'
  },
  {
    id: 'deep-house-offbeat-stabs',
    name: 'Deep House Offbeat Stabs',
    category: 'electronic',
    subgenre: 'Deep House',
    scale: 'minor',
    bars: 4,
    chords: stabs(
      [
        [0, 'i', 'minor9'],
        [3, 'iv', 'minor9'],
        [0, 'i', 'minor9'],
        [5, 'VI', 'major9']
      ],
      [
        [2, 1],
        [6, 1],
        [10, 1],
        [14, 1]
      ]
    ),
    description: 'Four offbeat ninth-chord stabs per bar form a warm i–iv–i–VI house loop.'
  },
  {
    id: 'piano-house-syncopated-stabs',
    name: 'Piano House Syncopated Stabs',
    category: 'electronic',
    subgenre: 'Piano House',
    scale: 'major',
    bars: 4,
    chords: stabs(
      [
        [1, 'ii', 'minor7'],
        [4, 'V', 'dominant7'],
        [0, 'I', 'add9'],
        [5, 'vi', 'minor7']
      ],
      [
        [0, 2],
        [3, 1],
        [6, 2],
        [10, 2],
        [14, 1]
      ]
    ),
    description: 'Five hits per bar mix eighth-note accents and short anticipations over a bright ii–V–I–vi cycle.'
  },
  {
    id: 'uk-garage-skipping-stabs',
    name: 'UK Garage Skipping Stabs',
    category: 'electronic',
    subgenre: 'UK Garage',
    scale: 'minor',
    bars: 4,
    chords: stabs(
      [
        [0, 'i', 'minor7'],
        [6, 'VII', 'dominant7'],
        [3, 'iv', 'minor7'],
        [4, 'v', 'minor7']
      ],
      [
        [1, 1],
        [3, 1],
        [6, 1],
        [9, 1],
        [11, 1],
        [14, 1]
      ]
    ),
    description: 'Six skipping sixteenth-note stabs per bar leave the downbeat open; add project swing for shuffle.'
  },
  {
    id: 'future-bass-eighth-stabs',
    name: 'Future Bass Eighth Stabs',
    category: 'electronic',
    subgenre: 'Future Bass',
    scale: 'minor',
    bars: 4,
    chords: stabs(
      [
        [5, 'VI', 'major7'],
        [6, 'VII', 'sus4'],
        [0, 'i', 'minor7'],
        [2, 'III', 'add9']
      ],
      [
        [0, 1],
        [2, 1],
        [4, 1],
        [6, 1],
        [8, 1],
        [10, 1],
        [12, 1],
        [14, 1]
      ]
    ),
    description: 'Eight gated eighth-note attacks per bar alternate short chords and rests for a bouncing drop.'
  },
  {
    id: 'trance-sixteenth-stabs',
    name: 'Trance Sixteenth Stabs',
    category: 'electronic',
    subgenre: 'Trance',
    scale: 'minor',
    bars: 4,
    chords: stabs(
      [
        [0, 'i', 'triad'],
        [5, 'VI', 'add9'],
        [2, 'III', 'triad'],
        [6, 'VII', 'sus4']
      ],
      Array.from({ length: STEPS_PER_BAR }, (_, step) => [step, 1] as const)
    ),
    description: 'Sixteen retriggered chords per bar drive a minor trance loop; use a fast-decay sound for separation.'
  }
]
