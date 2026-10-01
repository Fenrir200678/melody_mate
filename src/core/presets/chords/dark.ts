import type { PredefinedProgression } from '../../theory/progressions.types'

type Chord = PredefinedProgression['chords'][number]
const c = (degree: number, roman: string, quality: Chord['quality'] = 'triad', durationBars = 1): Chord => ({
  degree,
  roman,
  quality,
  durationBars
})

export const DARK_PROGRESSIONS: readonly PredefinedProgression[] = [
  {
    id: 'epic-dark',
    name: 'Epic Dark',
    category: 'dark',
    subgenre: 'Cinematic',
    scale: 'minor',
    bars: 4,
    chords: [c(0, 'i'), c(5, 'VI'), c(6, 'VII'), c(0, 'i')],
    description: 'A heroic minor cadence moving from solemn tonic through a rising resolution.'
  },
  {
    id: 'natural-minor',
    name: 'Natural Minor',
    category: 'dark',
    subgenre: 'Dark Folk',
    scale: 'minor',
    bars: 4,
    chords: [c(0, 'i'), c(3, 'iv'), c(4, 'v'), c(0, 'i')],
    description: 'A plain natural-minor cadence suited to dark folk, ritual, and doom arrangements.'
  },
  {
    id: 'andalusian',
    name: 'Andalusian Cadence',
    category: 'dark',
    subgenre: 'Flamenco / Drama',
    scale: 'minor',
    bars: 4,
    chords: [c(0, 'i'), c(6, 'VII'), c(5, 'VI'), c(4, 'V7', 'dominant7')],
    description: 'The descending Spanish tetrachord lands on a raised-third dominant for its characteristic pull.'
  },
  {
    id: 'modern-rock',
    name: 'Heavy Arena Minor',
    category: 'dark',
    subgenre: 'Modern Rock',
    scale: 'minor',
    bars: 4,
    chords: [c(0, 'i', 'power'), c(3, 'iv', 'power'), c(5, 'VI', 'power'), c(6, 'VII', 'power')],
    description: 'A heavier ascending minor route distinguishes this wall-of-sound loop from the synthwave cycle.'
  },
  {
    id: 'melancholic-fall',
    name: 'Melancholic Fall',
    category: 'dark',
    subgenre: 'Melancholic',
    scale: 'minor',
    bars: 4,
    chords: [c(0, 'i', 'minor7'), c(3, 'iv', 'minor7'), c(6, 'VII'), c(2, 'III', 'major7')],
    description: 'A soft minor opening drifts through subtonic color toward a bittersweet relative-major finish.'
  },
  {
    id: 'gothic-doom',
    name: 'Gothic Doom March',
    category: 'dark',
    subgenre: 'Gothic',
    scale: 'minor',
    bars: 4,
    chords: [c(0, 'i', 'power', 2), c(4, 'v', 'power'), c(5, 'VI', 'power')],
    description: 'Slow root-and-fifth blocks make room for a processional bass line and dark atmosphere.'
  },
  {
    id: 'phrygian-shadow',
    name: 'Phrygian Shadow',
    category: 'dark',
    subgenre: 'Dark Modal',
    scale: 'phrygian',
    bars: 4,
    chords: [c(0, 'i', 'power'), c(1, 'bII', 'power'), c(0, 'i', 'power'), c(6, 'bVII', 'power')],
    description: 'The half-step Phrygian second creates an immediate, unsettling clash against the tonic.'
  },
  {
    id: 'hans-cinematic',
    name: 'Cinematic Hero Journey',
    category: 'dark',
    subgenre: 'Film Score',
    scale: 'minor',
    bars: 4,
    chords: [c(0, 'i', 'minor7', 2), c(5, 'VI', 'major7', 0.5), c(3, 'iv', 'triad', 0.75), c(0, 'i', 'triad', 0.75)],
    description: 'Long tonic spans and a luminous VI support a gradual orchestral build.'
  },
  {
    id: 'noir-thriller',
    name: 'Noir Mystery',
    category: 'dark',
    subgenre: 'Crime Noir',
    scale: 'minor',
    bars: 4,
    chords: [c(0, 'i', 'minor7'), c(3, 'iv', 'minor7'), c(1, 'ii', 'power'), c(4, 'v', 'minor7')],
    description: 'Smoky minor sevenths and a tense supertonic create a shadowy, unresolved cycle.'
  },
  {
    id: 'dark-suspense',
    name: 'Two-Chord Dread',
    category: 'dark',
    subgenre: 'Thriller',
    scale: 'minor',
    bars: 4,
    chords: [c(0, 'i', 'power', 2), c(6, 'VII', 'power', 2)],
    description: 'An ominous tonic and subtonic pendulum sustains tension with minimal harmonic motion.'
  },
  {
    id: 'sad-farewell',
    name: 'Emotional Farewell',
    category: 'dark',
    subgenre: 'Lament',
    scale: 'minor',
    bars: 4,
    chords: [c(0, 'i', 'minor7'), c(6, 'VII'), c(3, 'iv', 'minor7'), c(4, 'v')],
    description: 'A lamenting minor descent detours through iv before ending on an unresolved dominant.'
  }
] as const
