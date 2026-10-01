import type { PredefinedProgression } from '../../theory/progressions.types'

type Chord = PredefinedProgression['chords'][number]
const c = (degree: number, roman: string, quality: Chord['quality'] = 'triad', durationBars = 1): Chord => ({
  degree,
  roman,
  quality,
  durationBars
})

export const ELECTRONIC_PROGRESSIONS: readonly PredefinedProgression[] = [
  {
    id: 'synthwave-nostalgia',
    name: 'Outrun Synthwave',
    category: 'electronic',
    subgenre: 'Synthwave',
    scale: 'minor',
    bars: 4,
    chords: [c(0, 'i', 'minor7'), c(5, 'VI', 'major7'), c(2, 'III', 'major7'), c(6, 'VII', 'sus4')],
    description: 'A cinematic minor-key cycle with wide seventh voicings for nostalgic arpeggios.'
  },
  {
    id: 'future-bass-euphoria',
    name: 'Future Bass Bounce',
    category: 'electronic',
    subgenre: 'Future Bass',
    scale: 'major',
    bars: 4,
    chords: [c(3, 'IV', 'major7'), c(4, 'V', 'sus4'), c(5, 'vi', 'minor7'), c(0, 'I', 'add9')],
    description: 'Bright, suspended changes built for wide supersaw voicings and a buoyant drop.'
  },
  {
    id: 'trance-uplifter',
    name: 'Progressive Trance',
    category: 'electronic',
    subgenre: 'Trance',
    scale: 'minor',
    bars: 4,
    chords: [c(0, 'i', 'minor7'), c(5, 'VI'), c(3, 'iv', 'minor7'), c(4, 'v')],
    description: 'A patient minor cadence for long builds, arpeggiated bass, and breakdowns.'
  },
  {
    id: 'deep-house-vamp',
    name: 'Deep House 2-Chord Vamp',
    category: 'electronic',
    subgenre: 'Deep House',
    scale: 'minor',
    bars: 4,
    chords: [c(0, 'i', 'minor9', 2), c(3, 'iv', 'minor9', 2)],
    description: 'A warm, unhurried two-chord Rhodes vamp for a rolling house groove.'
  },
  {
    id: 'french-touch',
    name: 'French Touch / Disco',
    category: 'electronic',
    subgenre: 'French House',
    scale: 'major',
    bars: 4,
    chords: [c(1, 'ii', 'minor7'), c(4, 'V', 'dominant7'), c(0, 'I', 'major7'), c(5, 'vi', 'minor7')],
    description: 'A smooth ii–V turnaround colored with jazzy sevenths for filtered funk-house.'
  },
  {
    id: 'melodic-techno',
    name: 'Melodic Techno Drive',
    category: 'electronic',
    subgenre: 'Melodic Techno',
    scale: 'minor',
    bars: 4,
    chords: [c(0, 'i', 'minor7'), c(4, 'v'), c(5, 'VI', 'major7'), c(3, 'iv')],
    description: 'A restrained minor cycle whose long tones support evolving synth patterns.'
  },
  {
    id: 'cyberpunk-drive',
    name: 'Cyberpunk Dystopia',
    category: 'electronic',
    subgenre: 'Industrial / Cyberpunk',
    scale: 'minor',
    bars: 4,
    chords: [c(0, 'i', 'power'), c(6, 'VII', 'power'), c(5, 'VI', 'power'), c(6, 'VII', 'power')],
    description: 'A stark root-and-fifth riff alternating tonic with the subtonic for industrial tension.'
  },
  {
    id: 'electro-pop-pulse',
    name: 'Electro Pop Pulse',
    category: 'electronic',
    subgenre: 'Electro Pop',
    scale: 'major',
    bars: 4,
    chords: [c(5, 'vi', 'minor7'), c(0, 'I', 'add9'), c(3, 'IV', 'major7'), c(4, 'V')],
    description: 'Relative-minor verse color turns toward a bright synth-pop hook.'
  },
  {
    id: 'liquid-dnb',
    name: 'Liquid Drum & Bass',
    category: 'electronic',
    subgenre: 'Drum & Bass',
    scale: 'major',
    bars: 4,
    chords: [c(3, 'IV', 'major9'), c(2, 'iii', 'minor7'), c(5, 'vi', 'minor9'), c(0, 'I', 'major7')],
    description: 'A floating, soulful sequence of extended chords over fast breakbeats.'
  },
  {
    id: 'space-ambient',
    name: 'Ambient Space Float',
    category: 'electronic',
    subgenre: 'Ambient',
    scale: 'minor',
    bars: 4,
    chords: [c(0, 'i', 'minor9', 2), c(5, 'VI', 'major7', 2)],
    description: 'Two slowly changing, extended pad chords leave space for evolving textures.'
  },
  {
    id: 'eurodance-energy',
    name: '90s Euro Energy',
    category: 'electronic',
    subgenre: 'Eurodance',
    scale: 'major',
    bars: 4,
    chords: [c(5, 'vi'), c(3, 'IV'), c(4, 'V'), c(5, 'vi')],
    description: 'A propulsive minor-starting loop with a strong dominant push for a four-on-the-floor chorus.'
  }
] as const
