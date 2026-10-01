export type RhythmCategory = 'melody' | 'bass' | 'world'

export interface RhythmStep {
  isNote: boolean
  durationSteps: number
}

export interface RhythmPreset {
  id: string
  name: string
  category: RhythmCategory
  subdivision: '8n' | '16n'
  steps: RhythmStep[]
  description?: string
}
