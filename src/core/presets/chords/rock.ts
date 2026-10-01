import type { PredefinedProgression } from '../../theory/progressions.types'

type Chord = PredefinedProgression['chords'][number]
const c = (degree: number, roman: string, quality: Chord['quality'] = 'triad', durationBars = 1): Chord => ({
  degree,
  roman,
  quality,
  durationBars
})

export const ROCK_PROGRESSIONS: readonly PredefinedProgression[] = [
  {
    id: 'classic-rock',
    name: 'Mixolydian Rock Anthem',
    category: 'rock',
    subgenre: 'Classic Rock',
    scale: 'mixolydian',
    bars: 4,
    chords: [c(0, 'I', 'power'), c(6, 'bVII', 'power'), c(3, 'IV', 'power'), c(0, 'I', 'power')],
    description: 'A swaggering I–bVII–IV riff draws its flat seventh directly from Mixolydian.'
  },
  {
    id: 'grunge-anthem',
    name: 'Seattle Grunge',
    category: 'rock',
    subgenre: 'Grunge',
    scale: 'minor',
    bars: 4,
    chords: [c(0, 'i', 'power'), c(2, 'III', 'power'), c(5, 'VI', 'power'), c(3, 'iv', 'power')],
    description: 'Brooding minor-root power chords shift between relative-major color and a heavy iv.'
  },
  {
    id: 'punk-power',
    name: '3-Chord Punk Blast',
    category: 'rock',
    subgenre: 'Punk Rock',
    scale: 'major',
    bars: 4,
    chords: [c(0, 'I', 'power', 2), c(3, 'IV', 'power'), c(4, 'V', 'power')],
    description: 'A driving tonic takes half the loop before quick IV and V power-chord hits.'
  },
  {
    id: 'blues-turnaround',
    name: 'Blues Turnaround',
    category: 'rock',
    subgenre: 'Blues Rock',
    scale: 'mixolydian',
    bars: 12,
    chords: [
      c(0, 'I7', 'dominant7'),
      c(0, 'I7', 'dominant7'),
      c(0, 'I7', 'dominant7'),
      c(0, 'I7', 'dominant7'),
      c(3, 'IV7', 'dominant7'),
      c(3, 'IV7', 'dominant7'),
      c(0, 'I7', 'dominant7'),
      c(0, 'I7', 'dominant7'),
      c(4, 'V7', 'dominant7'),
      c(3, 'IV7', 'dominant7'),
      c(0, 'I7', 'dominant7'),
      c(4, 'V7', 'dominant7')
    ],
    description: 'A full 12-bar blues form: four I bars, two IV, two I, then V–IV–I–V turnaround.'
  },
  {
    id: 'indie-anthem',
    name: 'Strummed Indie Folk',
    category: 'rock',
    subgenre: 'Indie Folk',
    scale: 'major',
    bars: 6,
    chords: [c(0, 'I'), c(4, 'V'), c(5, 'vi'), c(2, 'iii'), c(3, 'IV', 'triad', 2)],
    description: 'An acoustic five-chord arc saves a two-bar IV for a broad, singable finish.'
  },
  {
    id: 'stoner-desert',
    name: 'Desert Stoner Rock',
    category: 'rock',
    subgenre: 'Stoner Rock',
    scale: 'minor',
    bars: 4,
    chords: [c(0, 'i', 'power', 2), c(6, 'VII', 'power'), c(3, 'iv', 'power')],
    description: 'Long tonic weight and blunt subtonic and iv shifts make a slow, hypnotic desert riff.'
  },
  {
    id: 'post-rock-crescendo',
    name: 'Post-Rock Crescendo',
    category: 'rock',
    subgenre: 'Post-Rock',
    scale: 'major',
    bars: 4,
    chords: [c(5, 'vi', 'minor7'), c(3, 'IV', 'add9'), c(0, 'I', 'major7', 2)],
    description: 'A patient rise from relative minor to an extended, sustained tonic climax.'
  },
  {
    id: 'britpop-jangle',
    name: '90s Britpop Jangle',
    category: 'rock',
    subgenre: 'Britpop',
    scale: 'major',
    bars: 4,
    chords: [c(0, 'I'), c(5, 'vi'), c(3, 'IV'), c(0, 'I')],
    description: 'A bright guitar-pop loop uses the relative minor as a quick wistful turn.'
  },
  {
    id: 'folk-ballad',
    name: 'Acoustic Ballad',
    category: 'rock',
    subgenre: 'Folk Ballad',
    scale: 'major',
    bars: 4,
    chords: [c(5, 'vi', 'minor7'), c(3, 'IV', 'add9'), c(0, 'I', 'major7'), c(2, 'iii', 'minor7')],
    description: 'A bittersweet opening reaches warm tonic before the mediant leaves the loop gently open.'
  },
  {
    id: 'surf-rock',
    name: 'Surf Rock Tremolo',
    category: 'rock',
    subgenre: 'Surf Rock',
    scale: 'minor',
    bars: 4,
    chords: [c(0, 'i', 'power'), c(5, 'VI', 'power'), c(3, 'iv', 'power'), c(4, 'V', 'dominant7')],
    description: 'A minor surf progression ends on a raised-third dominant for a sharp turnaround.'
  }
] as const
