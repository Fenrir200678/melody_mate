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
 * Transposes a given melody diatonically within a scale.
 * @param notes - The array of AppNote objects to transpose.
 * @param scaleNotes - The notes of the scale (e.g., ['C', 'D', 'E', ...]).
 * @param steps - The number of scale steps to transpose by (positive for up, negative for down).
 * @returns A new array of AppNote objects with diatonically transposed pitches.
 */
export function transposeMelodyDiatonically(notes: AppNote[], scaleNotes: readonly string[], steps: number): AppNote[] {
  if (scaleNotes.length === 0) {
    console.warn('Cannot transpose diatonically with an empty scale.');
    return notes;
  }

  const scaleMidiValues = scaleNotes.map(pc => Note.midi(`${pc}4`)); // Use a reference octave (e.g., 4) for pitch classes

  return notes.map(note => {
    if (note.pitch === null) {
      return note; // Rests remain rests
    }

    const currentMidi = Note.midi(note.pitch);
    if (currentMidi === null) {
      console.warn(`Invalid note pitch for MIDI conversion: ${note.pitch}. Cannot transpose diatonically.`);
      return note; // Return original note if MIDI conversion fails
    }

    const pitchClass = Note.pitchClass(note.pitch);
    const currentOctave = Note.octave(note.pitch);

    const baseScaleIndex = scaleNotes.indexOf(pitchClass);
    if (baseScaleIndex === -1) {
      console.warn(`Note ${pitchClass} not found in scale. Cannot transpose diatonically.`);
      return note; // Return original note if not in scale
    }

    // Calculate the target index in the scale, considering wrapping
    let targetScaleIndex = baseScaleIndex + steps;
    let octaveShift = 0;

    while (targetScaleIndex >= scaleNotes.length) {
      targetScaleIndex -= scaleNotes.length;
      octaveShift++;
    }
    while (targetScaleIndex < 0) {
      targetScaleIndex += scaleNotes.length;
      octaveShift--;
    }

    // Get the MIDI value of the new pitch class in the reference octave
    const newPitchClassMidi = scaleMidiValues[targetScaleIndex];

    // Calculate the new MIDI value by adjusting for the octave shift
    const transposedMidi = newPitchClassMidi + (octaveShift * 12) + (currentOctave - 4) * 12; // Adjust for original octave

    // Ensure the transposed MIDI note is within a reasonable range (e.g., MIDI 0-127)
    const clampedMidi = Math.max(0, Math.min(127, transposedMidi));

    return { ...note, pitch: Note.fromMidi(clampedMidi) };
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
