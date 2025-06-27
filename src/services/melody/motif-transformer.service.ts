import type { AppNote } from '@/ts/models';
import { Note } from 'tonal';

/**
 * Transposes a given melody by a specified interval.
 * @param notes - The array of AppNote objects to transpose.
 * @param interval - The interval to transpose by (e.g., '2M' for a major second up, '-3m' for a minor third down).
 * @returns A new array of AppNote objects with transposed pitches.
 */
export function transposeMelody(notes: AppNote[], interval: string): AppNote[] {
  return notes.map(note => {
    if (note.pitch === null) {
      return note; // Rests remain rests
    }
    try {
      const transposedPitch = Note.transpose(note.pitch, interval);
      return { ...note, pitch: transposedPitch };
    } catch (error) {
      console.warn(`Could not transpose note ${note.pitch} by interval ${interval}:`, error);
      return note; // Return original note if transposition fails
    }
  });
}

/**
 * Inverts a given melody around its first note.
 * @param notes - The array of AppNote objects to invert.
 * @returns A new array of AppNote objects with inverted pitches.
 */
export function invertMelody(notes: AppNote[]): AppNote[] {
  if (notes.length === 0 || notes[0].pitch === null) {
    return notes; // Cannot invert an empty melody or a melody starting with a rest
  }

  const firstNoteMidi = Note.midi(notes[0].pitch as string);
  if (firstNoteMidi === null) {
    return notes; // Cannot invert if the first note is invalid
  }

  const invertedNotes: AppNote[] = [];
  notes.forEach(note => {
    if (note.pitch === null) {
      invertedNotes.push(note);
      return;
    }

    const currentNoteMidi = Note.midi(note.pitch);
    if (currentNoteMidi === null) {
      invertedNotes.push(note);
      return;
    }

    // Calculate the interval from the first note to the current note
    const intervalSemitones = currentNoteMidi - firstNoteMidi;

    // Invert the interval (e.g., +5 becomes -5)
    const invertedSemitones = -intervalSemitones;

    // Apply the inverted interval to the first note
    const invertedMidi = firstNoteMidi + invertedSemitones;

    // Ensure the inverted MIDI note is within a reasonable range (e.g., MIDI 0-127)
    const clampedMidi = Math.max(0, Math.min(127, invertedMidi));

    invertedNotes.push({ ...note, pitch: Note.fromMidi(clampedMidi) });
  });

  return invertedNotes;
}
