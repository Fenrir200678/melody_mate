import type { AppNote } from '@/ts/models'
import { Note } from 'tonal'

export function setMelodyOctave(notes: AppNote[], newOctave: number): AppNote[] {
  return notes.map((note) => ({
    ...note,
    pitch: note.pitch ? Note.pitchClass(note.pitch) + newOctave : null
  }))
}
