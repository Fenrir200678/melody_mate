import type { Scale } from '@/ts/models'
import { getNotesForScale } from '@/utils/scales'
import { ALL_KEYS, SCALE_DEFINITIONS } from '@/ts/const/scale.const'

/**
 * Returns a list of all available scale names.
 */
export function getAvailableScaleNames(): string[] {
  return Object.keys(SCALE_DEFINITIONS)
}

/**
 * Returns a list of all available musical keys (root notes).
 */
export function getAvailableKeys(): { name: string; value: string }[] {
  return ALL_KEYS
}

/**
 * Generates a scale object for a given name and root note.
 * @param name - The name of the scale (e.g., 'Major Scale').
 * @param key - The root note of the scale (e.g., 'G').
 * @returns A Scale object with the calculated notes.
 */
export function generateScale(name: string, key: string): Scale | undefined {
  const intervals = SCALE_DEFINITIONS[name]
  if (!intervals) {
    return undefined
  }

  const notes = getNotesForScale(intervals, key)
  return {
    name: `${key} ${name}`,
    notes
  }
}
