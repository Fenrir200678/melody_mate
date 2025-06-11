export interface RhythmPattern {
  name?: string // Add name for identifying presets
  steps: string[]
  weights?: number[]
  pattern?: (0 | 1)[] // Binary pattern: 1 = note, 0 = rest
  subdivision?: string // Base subdivision (e.g., '16n')
  pulses?: number // Number of pulses for Euclidean rhythms
}
