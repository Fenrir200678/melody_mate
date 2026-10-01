export type ProgressionCategory = 'pop' | 'electronic' | 'dark' | 'jazz-soul' | 'rock'

export type PresetChordQuality =
  'triad' | 'dominant7' | 'major7' | 'minor7' | 'halfDiminished7' | 'major9' | 'minor9' | 'power' | 'sus4' | 'add9'

export interface PresetChord {
  degree: number
  roman: string
  quality: PresetChordQuality
  durationBars: number
  /** Phrase-relative onset; omitted chords follow the previous chord without a rest. */
  startBar?: number
}

export interface PredefinedProgression {
  id: string
  name: string
  category: ProgressionCategory
  scale: string
  bars: number
  chords: PresetChord[]
  description?: string
  subgenre?: string
}
