import { useCompositionStore } from '@/stores/composition.store'
import { Chord, RomanNumeral, Note, Key } from 'tonal'
import type { Chord as AppChord } from '@/ts/models/Chord'
import { COMMON_CHORD_PROGRESSIONS, DARK_CHORD_PROGRESSIONS } from '@/data/chords-data'
import { generateScale } from './ScaleService'

/**
 * Generates a chord progression based on the selected key and scale.
 * @param progression - The selected chord progression (e.g., 'I-V-vi-IV').
 * @returns An array of chord objects.
 */
export function generateChordProgression(progression: string): AppChord[] {
  const compositionStore = useCompositionStore()
  const { key, scaleName } = compositionStore
  const chords = progression.split('-').map((roman) => {
    const romanData = RomanNumeral.get(roman)
    if (romanData.empty) {
      console.warn(`Invalid Roman numeral: ${roman}`)
      return { name: '', notes: [] } as AppChord
    }

    const scale = generateScale()
    if (!scale) {
      console.warn(`Could not generate scale for ${key} ${scaleName}`)
      return { name: '', notes: [] } as AppChord
    }

    const isMinorScale = scaleName.toLowerCase().includes('minor')
    const keyInfo = isMinorScale ? Key.minorKey(key) : Key.majorKey(key)

    if (!keyInfo || keyInfo.empty || !keyInfo.chords) {
      console.warn(`Could not get key info or chords for ${key} ${scaleName}`)
      return { name: '', notes: [] } as AppChord
    }

    const chordIndex = romanData.step
    if (chordIndex >= keyInfo.chords.length) {
      console.warn(`Roman numeral step ${chordIndex} out of bounds for key chords: ${key} ${scaleName}`)
      return { name: '', notes: [] } as AppChord
    }

    const diatonicChordName = keyInfo.chords[chordIndex]
    const chord = Chord.get(diatonicChordName)

    if (chord.empty) {
      console.warn(`Could not get chord for ${diatonicChordName}`)
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
 * Returns a list of available chord progressions.
 */
export function getAvailableChordProgressions(): string[] {
  return [...Object.keys(COMMON_CHORD_PROGRESSIONS), ...Object.keys(DARK_CHORD_PROGRESSIONS)]
}
