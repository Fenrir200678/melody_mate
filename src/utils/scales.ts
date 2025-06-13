import type { AppNote } from '@/ts/models/AppNote'
import { Note } from 'tonal'

/**
 * Converts a note name (e.g., 'C4') to a MIDI note number.
 */
export function noteNameToMidi(noteName: string | null): number {
  if (!noteName) return 0
  const midi = Note.midi(noteName)
  if (midi === null) throw new Error(`Invalid note name: ${noteName}`)
  return midi
}

/**
 * Converts a MIDI note number to a note name (e.g., 60 -> 'C4').
 */
export function midiToNoteName(midi: number): string {
  return Note.fromMidi(midi) || ''
}

/**
 * Maps a melody to a new scale, preserving the interval structure.
 * Die Logik bleibt erhalten, kann aber ggf. mit TonalJS weiter vereinfacht werden.
 */
export function mapMelodyToScale(melody: AppNote[], targetScaleNotes: string[]): AppNote[] {
  if (!melody.length || !targetScaleNotes.length) return []

  function findClosestScaleNote(midi: number, scaleMidis: number[]): number {
    return scaleMidis.reduce((prev, curr) => (Math.abs(curr - midi) < Math.abs(prev - midi) ? curr : prev))
  }

  const targetScaleMidis = targetScaleNotes.map(noteNameToMidi)
  const originalMidis = melody.map((n) => noteNameToMidi(n.pitch))
  const intervals = originalMidis.slice(1).map((midi, i) => midi - originalMidis[i])
  const startMidi = targetScaleMidis[0]
  const newMidis = [startMidi]
  for (let i = 0; i < intervals.length; i++) {
    const nextMidi = newMidis[i] + intervals[i]
    newMidis.push(findClosestScaleNote(nextMidi, targetScaleMidis))
  }
  return melody.map((note, i) => ({
    ...note,
    pitch: midiToNoteName(newMidis[i])
  }))
}
