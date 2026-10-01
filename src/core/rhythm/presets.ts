import { ALL_RHYTHM_PRESETS } from '../presets/rhythm'
import type { RhythmCategory, RhythmPreset } from './types'

export * from './types'

export const RHYTHM_PRESETS: readonly RhythmPreset[] = ALL_RHYTHM_PRESETS

export function getRhythmPresetCycleSteps(preset: RhythmPreset): number {
  const unit = preset.subdivision === '8n' ? 2 : 1
  return preset.steps.reduce((sum, step) => sum + step.durationSteps * unit, 0)
}

/**
 * Returns all available rhythm presets.
 */
export function getRhythmPresets(): readonly RhythmPreset[] {
  return RHYTHM_PRESETS
}

/**
 * Filters presets by musical category (melody, bass, world).
 */
export function getRhythmPresetsByCategory(category: RhythmCategory): RhythmPreset[] {
  return RHYTHM_PRESETS.filter((preset) => preset.category === category)
}

/**
 * Looks up a preset by its unique ID.
 */
export function getRhythmPresetById(id: string): RhythmPreset | undefined {
  return RHYTHM_PRESETS.find((preset) => preset.id === id)
}

/**
 * Picks a random rhythm preset ID from candidate presets or the global preset pool.
 */
export function pickRandomRhythmPresetId(
  candidatePresets?: readonly { id: string }[],
  rng: () => number = Math.random
): string | undefined {
  const pool = candidatePresets && candidatePresets.length > 0 ? candidatePresets : RHYTHM_PRESETS
  if (pool.length === 0) return undefined
  const randomIndex = Math.floor(rng() * pool.length)
  return pool[randomIndex].id
}
