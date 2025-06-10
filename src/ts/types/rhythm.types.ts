import type { RhythmPattern } from '../models/Rhythm'

export type RhythmCategory = 'bass' | 'melody' | 'world'

export type CategorizedRhythm = {
  name: string
  pattern: RhythmPattern
  category: RhythmCategory
  description?: string
}
