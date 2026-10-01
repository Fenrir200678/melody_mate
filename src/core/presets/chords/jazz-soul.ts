import type { PredefinedProgression } from '../../theory/progressions.types'

type Chord = PredefinedProgression['chords'][number]
const c = (degree: number, roman: string, quality: Chord['quality'] = 'triad', durationBars = 1): Chord => ({
  degree,
  roman,
  quality,
  durationBars
})

export const JAZZ_SOUL_PROGRESSIONS: readonly PredefinedProgression[] = [
  {
    id: 'jazz-cadence',
    name: 'Jazz Cadence (ii-V-I)',
    category: 'jazz-soul',
    subgenre: 'Jazz Standard',
    scale: 'major',
    bars: 4,
    chords: [
      c(1, 'ii', 'minor7', 0.5),
      c(4, 'V', 'dominant7', 0.5),
      c(0, 'I', 'major9', 0.5),
      c(5, 'vi', 'minor7', 0.5),
      c(1, 'ii', 'minor7', 0.5),
      c(4, 'V', 'dominant7', 0.5),
      c(0, 'I', 'major9', 1)
    ],
    description: 'A flowing ii–V–I sequence alternates half-bar jazz changes with a full-bar tonic arrival.'
  },
  {
    id: 'neo-soul-vamp',
    name: 'Neo-Soul Smooth Vamp',
    category: 'jazz-soul',
    subgenre: 'Neo-Soul',
    scale: 'major',
    bars: 4,
    chords: [c(3, 'IV', 'major9', 2), c(2, 'iii', 'minor9', 2)],
    description: 'A mellow two-chord exchange of lush major and minor ninth sonorities.'
  },
  {
    id: 'lofi-chill',
    name: 'Lo-Fi Study Beat',
    category: 'jazz-soul',
    subgenre: 'Lo-Fi Hip-Hop',
    scale: 'major',
    bars: 4,
    chords: [c(1, 'ii', 'minor7'), c(4, 'V', 'dominant7'), c(0, 'I', 'major7'), c(5, 'vi', 'minor9')],
    description: 'A warm jazz turnaround resolves to tonic before slipping into a reflective vi.'
  },
  {
    id: 'rnb-slow-jam',
    name: '90s R&B Slow Jam',
    category: 'jazz-soul',
    subgenre: '90s R&B',
    scale: 'major',
    bars: 4,
    chords: [c(3, 'IV', 'major7'), c(2, 'iii', 'minor7'), c(5, 'vi', 'minor9'), c(1, 'ii', 'minor7')],
    description: 'Silky extended chords move through a descending soul sequence into ii.'
  },
  {
    id: 'sentimental-minor',
    name: 'Sentimental Minor 2-5-1',
    category: 'jazz-soul',
    subgenre: 'Jazz Ballad',
    scale: 'minor',
    bars: 4,
    chords: [c(1, 'iiø7', 'halfDiminished7'), c(4, 'V7', 'dominant7'), c(0, 'i9', 'minor9', 2)],
    description: 'A tender minor-key iiø7–V7–i9 cadence, with a long ninth voicing on the final tonic.'
  },
  {
    id: 'gospel-turnaround',
    name: 'Gospel Turnaround',
    category: 'jazz-soul',
    subgenre: 'Gospel',
    scale: 'major',
    bars: 4,
    chords: [c(0, 'I', 'major7'), c(5, 'vi', 'minor7'), c(1, 'ii', 'minor7'), c(4, 'V', 'dominant7')],
    description: 'A gospel-flavored cycle of fifth-related chords that leads naturally back to I.'
  },
  {
    id: 'bossa-breeze',
    name: 'Bossa Breeze',
    category: 'jazz-soul',
    subgenre: 'Bossa Nova',
    scale: 'major',
    bars: 4,
    chords: [
      c(0, 'I', 'major7', 0.25),
      c(1, 'ii', 'minor7', 0.25),
      c(2, 'iii', 'minor7', 0.25),
      c(1, 'ii', 'minor7', 0.25),
      c(0, 'I', 'major7'),
      c(1, 'ii', 'minor7'),
      c(0, 'I', 'major7')
    ],
    description:
      'Four quarter-bar chord changes open a gentle bossa turnaround before longer changes let the groove breathe.'
  },
  {
    id: 'city-pop-glide',
    name: 'Shibuya City Pop',
    category: 'jazz-soul',
    subgenre: 'City Pop',
    scale: 'major',
    bars: 4,
    chords: [c(3, 'IV', 'major9'), c(2, 'iii', 'minor7'), c(1, 'ii', 'minor7'), c(0, 'I', 'major7')],
    description: 'A descending chain of rich chords lands on a polished major-seventh tonic.'
  },
  {
    id: 'groove-turnaround',
    name: 'Funk Turnaround',
    category: 'jazz-soul',
    subgenre: 'Funk / Soul',
    scale: 'dorian',
    bars: 4,
    chords: [c(0, 'i', 'minor7', 2), c(3, 'IV', 'dominant7'), c(4, 'v', 'minor7')],
    description: 'A Dorian minor vamp uses its major IV for a bright, syncopated funk lift.'
  },
  {
    id: 'dreamy-rhodes',
    name: 'Dreamy Rhodes Glow',
    category: 'jazz-soul',
    subgenre: 'Contemporary Soul',
    scale: 'major',
    bars: 4,
    chords: [c(3, 'IV', 'major9'), c(0, 'I', 'major7'), c(1, 'ii', 'minor9'), c(5, 'vi', 'minor7')],
    description: 'Spacious Rhodes voicings circle between luminous major and mellow minor colors.'
  },
  {
    id: 'step-down-soul',
    name: 'Step-Down Soul',
    category: 'jazz-soul',
    subgenre: 'Soul Ballad',
    scale: 'major',
    bars: 4,
    chords: [c(5, 'vi', 'minor7'), c(4, 'V'), c(3, 'IV', 'major7'), c(0, 'I', 'major7')],
    description: 'A bass descent from vi to tonic bridges vintage soul and contemporary ballad writing.'
  }
] as const
