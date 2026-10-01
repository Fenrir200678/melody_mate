import { Note } from 'tonal'
import type { ChordEvent } from '../schemas/chord.schema'
import { getChordNotes } from '../theory/chord.engine'

/**
 * Resolves the chord notes active at a given sequencer step.
 * Falls back to the pitch class of `fallbackRoot` when no chord covers the step;
 * returns an empty array if no fallback root is provided.
 */
export function getActiveChordNotes(
  step: number,
  stepsPerBar: number,
  chords?: ChordEvent[],
  fallbackRoot?: string
): string[] {
  const fallback = fallbackRoot ? [Note.pitchClass(fallbackRoot) || fallbackRoot] : []

  if (!chords || chords.length === 0 || stepsPerBar <= 0) {
    return fallback
  }

  const currentBar = step / stepsPerBar
  const chord = chords.find((c) => currentBar >= c.startBar && currentBar < c.startBar + c.durationBars)

  if (!chord) {
    return fallback
  }

  return chord.notes.length > 0 ? chord.notes : getChordNotes(chord.name)
}
