import type { PredefinedProgression } from '../../theory/progressions.types'

type Chord = PredefinedProgression['chords'][number]
const c = (degree: number, roman: string, quality: Chord['quality'] = 'triad', durationBars = 1): Chord => ({
  degree,
  roman,
  quality,
  durationBars
})

export const POP_PROGRESSIONS: readonly PredefinedProgression[] = [
  {
    id: 'pop-standard',
    name: 'Pop Standard',
    category: 'pop',
    subgenre: 'Modern Pop',
    scale: 'major',
    bars: 4,
    chords: [c(0, 'I'), c(4, 'V'), c(5, 'vi'), c(3, 'IV')],
    description: 'The familiar tonic, dominant, relative-minor, and subdominant loop behind generations of chart pop.'
  },
  {
    id: 'classic',
    name: 'Classic Cadence',
    category: 'pop',
    subgenre: 'Classical / Folk',
    scale: 'major',
    bars: 4,
    chords: [c(0, 'I'), c(3, 'IV'), c(4, 'V'), c(0, 'I')],
    description: 'A direct folk cadence with a clear dominant return to tonic.'
  },
  {
    id: 'emotional-pop',
    name: 'Emotional Pop (Axis)',
    category: 'pop',
    subgenre: 'Emotional Pop',
    scale: 'major',
    bars: 4,
    chords: [c(5, 'vi'), c(3, 'IV'), c(0, 'I'), c(4, 'V')],
    description: 'Relative-minor opening gives the chorus a wistful lift into a bright tonic.'
  },
  {
    id: 'doo-wop',
    name: '50s Doo-Wop',
    category: 'pop',
    subgenre: 'Vintage Pop',
    scale: 'major',
    bars: 4,
    chords: [c(0, 'I'), c(5, 'vi'), c(3, 'IV'), c(4, 'V')],
    description: 'The nostalgic I–vi–IV–V turn of mid-century vocal pop.'
  },
  {
    id: 'royal-road',
    name: 'Royal Road (Oudou)',
    category: 'pop',
    subgenre: 'J-Pop / Anime',
    scale: 'major',
    bars: 4,
    chords: [c(3, 'IV'), c(4, 'V'), c(2, 'iii'), c(5, 'vi')],
    description: 'A subdominant launch and rising dominant energy resolve into the relative minor.'
  },
  {
    id: 'canon-pop',
    name: 'Pachelbel Canon',
    category: 'pop',
    subgenre: 'Baroque Pop',
    scale: 'major',
    bars: 8,
    chords: [c(0, 'I'), c(4, 'V'), c(5, 'vi'), c(2, 'iii'), c(3, 'IV'), c(0, 'I'), c(3, 'IV'), c(4, 'V')],
    description: 'An eight-bar adaptation of the familiar descending bass sequence.'
  },
  {
    id: 'anthem-lift',
    name: 'Stadium Anthem',
    category: 'pop',
    subgenre: 'Arena Pop',
    scale: 'major',
    bars: 4,
    chords: [c(0, 'I', 'add9'), c(4, 'V'), c(3, 'IV', 'add9'), c(4, 'V')],
    description: 'Broad tonic and subdominant sonorities frame an insistent dominant turnaround.'
  },
  {
    id: 'hopeful-rise',
    name: 'Hopeful Rise',
    category: 'pop',
    subgenre: 'Indie Pop',
    scale: 'major',
    bars: 4,
    chords: [c(3, 'IV', 'major7'), c(0, 'I', 'add9'), c(5, 'vi', 'minor7'), c(4, 'V')],
    description: 'A soft IV opening unfolds into luminous extended chords and a hopeful dominant.'
  },
  {
    id: 'millennial-whoop',
    name: 'Indie Hook',
    category: 'pop',
    subgenre: 'Indie Pop',
    scale: 'major',
    bars: 4,
    chords: [c(0, 'I'), c(5, 'vi'), c(2, 'iii'), c(3, 'IV')],
    description: 'A major tonic slips through the relative minor and mediant before opening onto IV.'
  },
  {
    id: 'optimist-vamp',
    name: 'Two-Chord Sunburst',
    category: 'pop',
    subgenre: 'Feel-Good',
    scale: 'major',
    bars: 4,
    chords: [c(0, 'I', 'add9', 2), c(3, 'IV', 'add9', 2)],
    description: 'A spacious two-chord vamp leaves room for vocal hooks and instrumental replies.'
  },
  {
    id: 'delayed-cadence',
    name: 'Delayed Cadence',
    category: 'pop',
    subgenre: 'Acoustic Pop',
    scale: 'major',
    bars: 4,
    chords: [c(0, 'I', 'triad', 2), c(4, 'V'), c(3, 'IV', 'triad', 0.5), c(0, 'I', 'triad', 0.5)],
    description: 'A sustained tonic gives way to two quick passing chords and a settled return.'
  }
] as const
