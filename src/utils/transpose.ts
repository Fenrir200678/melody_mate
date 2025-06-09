import type { Note } from '@/models'

export function setMelodyOctave(notes: Note[], newOctave: number): Note[] {
  return notes.map((note) => ({
    ...note,
    pitch: note.pitch.replace(/\d$/, String(newOctave))
  }))
}
