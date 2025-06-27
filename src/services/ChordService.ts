import { useCompositionStore } from '@/stores/composition.store'
import { Chord, RomanNumeral, Note, Interval, Scale } from 'tonal'
import type { Chord as AppChord } from '@/ts/models/Chord'
import { COMMON_CHORD_PROGRESSIONS, DARK_CHORD_PROGRESSIONS } from '@/data/chords-data'
import { generateScale } from './ScaleService'

/**
 * Determines the chord quality based on scale intervals
 * @param rootNote - The root note of the chord
 * @param scaleNotes - Array of notes in the scale
 * @returns The chord type (M, m, dim, etc.)
 */
function getChordQualityFromScale(rootNote: string, scaleNotes: string[]): string {
  const rootIndex = scaleNotes.indexOf(rootNote)
  if (rootIndex === -1) return 'M' // fallback

  // Get the third and fifth intervals from the root
  const thirdIndex = (rootIndex + 2) % scaleNotes.length
  const fifthIndex = (rootIndex + 4) % scaleNotes.length

  const third = scaleNotes[thirdIndex]
  const fifth = scaleNotes[fifthIndex]

  // Calculate intervals from root
  const thirdInterval = Interval.distance(rootNote, third)
  const fifthInterval = Interval.distance(rootNote, fifth)

  // Determine chord quality based on intervals
  const thirdSemitones = Interval.semitones(thirdInterval) || 0
  const fifthSemitones = Interval.semitones(fifthInterval) || 0

  // Check for diminished (minor third + diminished fifth)
  if (thirdSemitones % 12 === 3 && fifthSemitones % 12 === 6) {
    return 'dim'
  }
  // Check for augmented (major third + augmented fifth)
  else if (thirdSemitones % 12 === 4 && fifthSemitones % 12 === 8) {
    return 'aug'
  }
  // Check for minor (minor third + perfect fifth)
  else if (thirdSemitones % 12 === 3 && fifthSemitones % 12 === 7) {
    return 'm'
  }
  // Default to major (major third + perfect fifth)
  else {
    return 'M'
  }
}

/**
 * Generates a chord progression based on the selected key and scale.
 * @param progression - The selected chord progression (e.g., 'I-V-vi-IV').
 * @returns An array of chord objects.
 */
export function generateChordProgression(progression: string): AppChord[] {
  const compositionStore = useCompositionStore()
  const { key, scaleName } = compositionStore
  const chords = progression.split('-').map((roman) => {
    const scale = generateScale()
    if (!scale) {
      console.warn(`Could not generate scale for ${key} ${scaleName}`)
      return { name: '', notes: [] } as AppChord
    }

    const scaleNotes = scale.notes.map(Note.pitchClass)

    const romanData = RomanNumeral.get(roman)
    if (romanData.empty) {
      console.warn(`Invalid Roman numeral: ${roman}`)
      return { name: '', notes: [] } as AppChord
    }

    const rootIndex = romanData.step
    if (rootIndex >= scaleNotes.length) {
      console.warn(`Roman numeral step ${rootIndex} out of bounds for scale: ${key} ${scaleName}`)
      return { name: '', notes: [] } as AppChord
    }

    let rootNote = scaleNotes[rootIndex]

    if (romanData.acc) {
      rootNote = Note.transpose(rootNote, romanData.acc + '1')
    }

    // Determine chord type based on the scale, not just Roman numeral case
    let chordType = romanData.chordType || ''
    if (!chordType) {
      chordType = getChordQualityFromScale(rootNote, scaleNotes)
    }

    const fullChordName = rootNote + chordType
    const chord = Chord.get(fullChordName)

    if (chord.empty) {
      console.warn(`Could not get chord for ${fullChordName}`)
      return { name: '', notes: [] } as AppChord
    }

    return {
      name: chord.name,
      notes: chord.notes.map(Note.pitchClass)
    } as AppChord
  })
  return chords
}

/**
 * Generates a list of diatonic triads for a given key and scale.
 * @param key - The root note of the scale (e.g., 'C').
 * @param scaleName - The name of the scale (e.g., 'major').
 * @returns An array of AppChord objects representing the diatonic triads.
 */
export function getDiatonicTriads(key: string, scaleName: string): AppChord[] {
  const scale = Scale.get(`${key} ${scaleName}`);
  if (scale.empty || !scale.notes.length) {
    console.warn(`Could not generate scale for diatonic triads: ${key} ${scaleName}`);
    return [];
  }

  const scaleNotes = scale.notes.map(Note.pitchClass);
  const diatonicChords: AppChord[] = [];

  for (let i = 0; i < scaleNotes.length; i++) {
    const rootNote = scaleNotes[i];
    const chordType = getChordQualityFromScale(rootNote, scaleNotes);
    const fullChordName = rootNote + chordType;
    const chord = Chord.get(fullChordName);

    if (!chord.empty) {
      diatonicChords.push({
        name: chord.name,
        notes: chord.notes.map(Note.pitchClass)
      });
    } else {
      console.warn(`Could not get chord for diatonic triad: ${fullChordName}`);
    }
  }

  return diatonicChords;
}

/**
 * Returns a list of available chord progressions.
 */
export function getAvailableChordProgressions(): string[] {
  return [...Object.keys(COMMON_CHORD_PROGRESSIONS), ...Object.keys(DARK_CHORD_PROGRESSIONS)]
}
