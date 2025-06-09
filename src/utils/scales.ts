import { ALL_KEYS } from '@/ts/const/scale.const'

const noteIndexMap: Map<string, number> = new Map(ALL_KEYS.map((note, i) => [note.value, i]))

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
    return ALL_KEYS[noteIndex].value + octave
  })
}

/**
 * Converts a note name (e.g., 'C4') to a MIDI note number.
 * @param noteName - The note name (e.g., 'C4').
 * @returns The MIDI note number.
 */
export function noteNameToMidi(noteName: string): number {
  const match = noteName.match(/^([A-G]#?)(\d)$/)
  if (!match) throw new Error(`Invalid note name: ${noteName}`)
  const [, pitch, octaveStr] = match
  const octave = parseInt(octaveStr, 10)
  const noteIndex = noteIndexMap.get(pitch)
  if (noteIndex === undefined) throw new Error(`Invalid pitch: ${pitch}`)
  return (octave + 1) * 12 + noteIndex
}

/**
 * Converts a MIDI note number to a note name (e.g., 60 -> 'C4').
 * @param midi - The MIDI note number.
 * @returns The note name.
 */
export function midiToNoteName(midi: number): string {
  const noteIndex = midi % 12
  const octave = Math.floor(midi / 12) - 1
  return ALL_KEYS[noteIndex].value + octave
}

/**
 * Maps a melody to a new scale, preserving the interval structure.
 * The first note is mapped to the root of the target scale, alle weiteren Noten folgen der Intervallstruktur.
 * @param melody - Die Originalmelodie (Array von Notes)
 * @param targetScaleNotes - Array der Ziel-Scale-Noten (z.B. ['C4', 'D4', ...])
 * @returns Die transformierte Melodie
 */
import type { Note } from '@/ts/models/Note'

export function mapMelodyToScale(melody: Note[], targetScaleNotes: string[]): Note[] {
  if (!melody.length || !targetScaleNotes.length) return []

  // Hilfsfunktion: MIDI-Nummer für eine Note in der Ziel-Scale finden, die am nächsten an einer Ziel-MIDI liegt
  function findClosestScaleNote(midi: number, scaleMidis: number[]): number {
    return scaleMidis.reduce((prev, curr) => (Math.abs(curr - midi) < Math.abs(prev - midi) ? curr : prev))
  }

  // MIDI-Nummern der Ziel-Scale berechnen
  const targetScaleMidis = targetScaleNotes.map(noteNameToMidi)

  // Intervallstruktur der Originalmelodie berechnen (in Halbtonschritten)
  const originalMidis = melody.map((n) => noteNameToMidi(n.pitch))
  const intervals = originalMidis.slice(1).map((midi, i) => midi - originalMidis[i])

  // Startnote: erste Note der Ziel-Scale
  const startMidi = targetScaleMidis[0]
  const newMidis = [startMidi]
  for (let i = 0; i < intervals.length; i++) {
    const nextMidi = newMidis[i] + intervals[i]
    // Finde die nächste Note in der Ziel-Scale, die dem gewünschten MIDI am nächsten ist
    newMidis.push(findClosestScaleNote(nextMidi, targetScaleMidis))
  }

  // Neue Melodie erzeugen (Rhythmus und Velocity übernehmen)
  return melody.map((note, i) => ({
    ...note,
    pitch: midiToNoteName(newMidis[i])
  }))
}
