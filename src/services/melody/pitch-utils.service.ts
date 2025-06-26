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
export function getPitchWithOctave(pitch: string, minOctave: number, maxOctave: number): string {
  const parsed = Note.get(pitch)
  if (!parsed || !parsed.pc) {
    const randomOctave = Math.floor(Math.random() * (maxOctave - minOctave + 1)) + minOctave
    return pitch.replace(/[0-9]+$/, '') + randomOctave
  }
  const randomOctave = Math.floor(Math.random() * (maxOctave - minOctave + 1)) + minOctave
  return parsed.pc + randomOctave
}
