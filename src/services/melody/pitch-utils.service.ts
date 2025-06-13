import { Note } from 'tonal'

/**
 * Service for pitch-related utility functions.
 */

/**
 * Gets the pitch with the octave from the pitch string.
 * @param pitch - The pitch string to get the octave from.
 * @param octave - The octave to add to the pitch.
 * @returns The pitch with the octave.
 */
export function getPitchWithOctave(pitch: string, octave: number): string {
  const parsed = Note.get(pitch)
  if (!parsed || !parsed.pc) {
    return pitch.replace(/[0-9]+$/, '') + octave
  }
  return parsed.pc + octave
}
