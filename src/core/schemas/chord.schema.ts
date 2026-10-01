import { z } from 'zod'
import { STEPS_PER_BAR } from './project.schema'

export const ChordEventSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  roman: z.string(),
  // Pitch-class identity (e.g. ['C', 'E', 'G']) used by the generator and name display
  notes: z.array(z.string()),
  // Absolute pitches with octaves in ascending order (e.g. ['C3', 'E3', 'G3']) used by
  // playback, MIDI export, rendering and piano-roll editing
  voicing: z.array(z.string()).min(1),
  startBar: z.number().min(0),
  durationBars: z.number().min(1 / STEPS_PER_BAR),
  inversion: z.number().int().min(0).max(3).default(0)
})

export type ChordEvent = Omit<z.infer<typeof ChordEventSchema>, 'inversion'> & {
  inversion?: number
}

/**
 * Canonical selection key for one voicing note of a chord (`${chordId}:${noteIndex}`).
 * Single source of truth shared by store, renderer, interactions and shortcuts.
 */
export function chordNoteKey(chordId: string, noteIndex: number): string {
  return `${chordId}:${noteIndex}`
}

export function parseChordNoteKey(key: string): { chordId: string; noteIndex: number } | null {
  const idx = key.lastIndexOf(':')
  if (idx <= 0) return null
  const noteIndex = Number(key.slice(idx + 1))
  if (!Number.isInteger(noteIndex) || noteIndex < 0) return null
  return { chordId: key.slice(0, idx), noteIndex }
}

/**
 * Remaps index-based selection keys after a voicing note was removed: the removed
 * index is dropped and higher indices shift down so selections stay bound to the
 * same notes.
 */
export function remapChordNoteSelection(chordId: string, removedIndex: number, keys: string[]): string[] {
  const result: string[] = []
  for (const key of keys) {
    const parsed = parseChordNoteKey(key)
    if (!parsed || parsed.chordId !== chordId) {
      result.push(key)
      continue
    }
    if (parsed.noteIndex === removedIndex) continue
    if (parsed.noteIndex > removedIndex) {
      result.push(chordNoteKey(chordId, parsed.noteIndex - 1))
      continue
    }
    result.push(key)
  }
  return result
}
