import { Note } from 'tonal'
import { getScaleNotes } from './scale.engine'

const ACCIDENTAL_PAIRS: Record<number, { sharp: string; flat: string }> = {
  1: { sharp: 'C#', flat: 'Db' },
  3: { sharp: 'D#', flat: 'Eb' },
  6: { sharp: 'F#', flat: 'Gb' },
  8: { sharp: 'G#', flat: 'Ab' },
  10: { sharp: 'A#', flat: 'Bb' }
}

const NATURAL_NOTES: Record<number, string> = {
  0: 'C',
  2: 'D',
  4: 'E',
  5: 'F',
  7: 'G',
  9: 'A',
  11: 'B'
}

/**
 * Returns a human-friendly note label for a piano keyboard key.
 *
 * - Natural notes display their note name and octave (e.g. "C4", "D4").
 * - Accidental keys display both enharmonic spellings (e.g. "C#4 / Db4"),
 *   prioritizing the spelling that matches the active musical scale (e.g. "Db4 / C#4" in F minor).
 * - Root notes are clearly annotated with "(Root)" (e.g. "F4 (Root)", "Bb4 / A#4 (Root)").
 */
export function getKeyboardKeyTooltip(midi: number, rootKey?: string, scale?: string): string {
  if (midi < 0 || midi > 127 || !Number.isFinite(midi)) {
    return ''
  }

  const roundedMidi = Math.round(midi)
  const chroma = ((roundedMidi % 12) + 12) % 12
  const oct = Math.floor(roundedMidi / 12) - 1

  const rootPc = rootKey ? Note.pitchClass(rootKey) || rootKey.trim() : undefined
  const isRoot = rootPc !== undefined && Note.chroma(rootPc) === chroma

  // Determine if the scale contains a specific spelling for this pitch chroma
  let scaleSpelling: string | undefined
  if (rootKey && scale) {
    const scaleNotes = getScaleNotes(rootKey, scale)
    const matched = scaleNotes.find((n) => Note.chroma(n) === chroma)
    if (matched) {
      scaleSpelling = Note.pitchClass(matched) || matched
    }
  }

  // Natural note (white key)
  if (chroma in NATURAL_NOTES) {
    const baseName = NATURAL_NOTES[chroma]
    const displayName =
      scaleSpelling && scaleSpelling !== baseName ? `${scaleSpelling}${oct} / ${baseName}${oct}` : `${baseName}${oct}`

    return isRoot ? `${displayName} (Root)` : displayName
  }

  // Accidental note (black key)
  const pair = ACCIDENTAL_PAIRS[chroma]
  if (!pair) {
    return ''
  }

  let formattedAccidental: string
  if (isRoot && rootPc) {
    const isFlatRoot = rootPc.includes('b')
    formattedAccidental = isFlatRoot
      ? `${pair.flat}${oct} / ${pair.sharp}${oct}`
      : `${pair.sharp}${oct} / ${pair.flat}${oct}`
    return `${formattedAccidental} (Root)`
  }

  if (scaleSpelling && (scaleSpelling === pair.flat || scaleSpelling.includes('b'))) {
    formattedAccidental = `${pair.flat}${oct} / ${pair.sharp}${oct}`
  } else {
    formattedAccidental = `${pair.sharp}${oct} / ${pair.flat}${oct}`
  }

  return formattedAccidental
}
