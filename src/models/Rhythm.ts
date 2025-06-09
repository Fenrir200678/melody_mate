export interface RhythmPattern {
  name?: string // Add name for identifying presets
  steps: string[]
  weights?: number[]
  pattern?: (0 | 1)[] // Binary pattern: 1 = note, 0 = rest
  subdivision?: string // Base subdivision (e.g., '16n')
  noteDurations?: string[] // Actual durations for each note (only for played notes)
  pulses?: number // Number of pulses for Euclidean rhythms
}
