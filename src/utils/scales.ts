export const ALL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const noteIndexMap: Map<string, number> = new Map(ALL_KEYS.map((note, i) => [note, i]))

/**
 * Converts a scale pattern (intervals) and a root note into an array of note names.
 * @param intervals - Array of semitone intervals from the root (e.g., [0, 2, 4, 5, 7, 9, 11] for Major).
 * @param rootNote - The root note of the scale (e.g., 'G').
 * @param octave - The octave of the notes (default is 4).
 * @returns An array of note names for the scale.
 */
export function getNotesForScale(intervals: number[], rootNote: string, octave: number = 4): string[] {
  const rootIndex = noteIndexMap.get(rootNote)
  if (rootIndex === undefined) {
    throw new Error(`Invalid root note: ${rootNote}`)
  }

  return intervals.map((interval) => {
    const noteIndex = (rootIndex + interval) % 12
    return ALL_KEYS[noteIndex] + octave
  })
}
