import type { AppNote } from '@/ts/models'

export function setMelodyOctave(notes: AppNote[], newOctave: number): AppNote[] {
  return notes.map((note) => ({
    ...note,
    pitch: note.pitch ? note.pitch.replace(/\d$/, String(newOctave)) : null
  }))
}
