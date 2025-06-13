import type { AppScale } from '@/ts/models'
import { Scale } from 'tonal'

/**
 * Returns a list of all available scale names.
 */
export function getAvailableScaleNames(): string[] {
  return [
    'major',
    'minor',
    'harmonic minor',
    'melodic minor',
    'bebop major',
    'bebop minor',
    'blues',
    'major pentatonic',
    'minor pentatonic',
    'dorian',
    'phrygian',
    'lydian',
    'mixolydian',
    'locrian',
    'whole tone',
    'whole-half diminished',
    'half-whole diminished',
    'hungarian minor',
    'phrygian dominant',
    'double harmonic major',
    'ichikosucho'
  ]
}

/**
 * Returns a list of all available musical keys (root notes).
 */
export function getAvailableKeys(): { name: string; value: string }[] {
  return [
    { name: 'C', value: 'C' },
    { name: 'C♯ / D♭', value: 'C#' },
    { name: 'D', value: 'D' },
    { name: 'D♯ / E♭', value: 'D#' },
    { name: 'E', value: 'E' },
    { name: 'F', value: 'F' },
    { name: 'F♯ / G♭', value: 'F#' },
    { name: 'G', value: 'G' },
    { name: 'G♯ / A♭', value: 'G#' },
    { name: 'A', value: 'A' },
    { name: 'A♯ / B♭', value: 'A#' },
    { name: 'B', value: 'B' }
  ]
}

/**
 * Generates a scale object for a given name and root note.
 * @param name - The name of the scale (e.g., 'Major Scale').
 * @param key - The root note of the scale (e.g., 'G').
 * @returns A AppScale object with the calculated notes.
 */
export function generateScale(name: string, key: string): AppScale | undefined {
  const scale = Scale.get(`${key} ${name}`)
  if (!scale.notes.length) return undefined
  return {
    name: `${key} ${name}`,
    notes: scale.notes
  }
}
