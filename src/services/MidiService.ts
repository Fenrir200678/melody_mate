import type { AppNote, Melody } from '@/ts/models'
import MidiWriter from 'midi-writer-js'
import { usePlayerStore } from '@/stores/player.store'

/**
 * Converts a melody object into a MIDI file and triggers a download.
 * @param melody - The melody to be saved.
 * @param fileName - The desired name for the MIDI file.
 */

export function generateMidiFile(melody: Melody, track: any): string {
  if (!melody.notes.length) {
    console.warn('Cannot save an empty melody.')
    return ''
  }

  const playerStore = usePlayerStore()
  const { bpm, selectedInstrument: instrument } = playerStore

  track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: instrument || 0 }))
  track.setTempo(bpm || 120, 0)

  // Entferne alle abschließenden Pausen am Ende der Notenliste
  const notes = [...melody.notes]
  while (notes.length > 0 && notes[notes.length - 1].pitch === null) {
    notes.pop()
  }

  const noteEvents: any[] = []
  let pendingWaitTicks = 0

  notes.forEach((note) => {
    if (typeof note.pitch === 'string' && note.pitch.length > 0) {
      // regular note
      if (note.pitch === '0') {
        console.warn('Skipping invalid pitch 0 in note:', note)
        return
      }
      const event = new MidiWriter.NoteEvent({
        pitch: [note.pitch],
        duration: note.duration,
        wait: `T${pendingWaitTicks}`,
        velocity: _getVelocity(note)
      })
      // Reset wait time AFTER applying it to the current note
      pendingWaitTicks = 0
      noteEvents.push(event)
    } else {
      // rest
      const restTicks = parseInt(note.duration.substring(1)) || 0
      pendingWaitTicks += restTicks
    }
  })

  // Am Ende: KEIN NoteEvent für übrig gebliebene Wartezeit erzeugen!
  if (pendingWaitTicks > 0) {
    // Do nothing: do NOT create a NoteEvent for this!
    pendingWaitTicks = 0
  }

  // Entferne alle leeren NoteEvents (z.B. mit leerem Pitch-Array)
  const filteredNoteEvents = noteEvents.filter((e) => (Array.isArray(e.pitch) ? e.pitch.length > 0 : true))

  track.addEvent(filteredNoteEvents)
  const writer = new MidiWriter.Writer([track])
  const dataUri = writer.dataUri()

  return dataUri
}

export function downloadMidiFile(dataUri: string, fileName: string): void {
  const link = document.createElement('a')
  link.href = dataUri
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function _getVelocity(note: AppNote) {
  const playerStore = usePlayerStore()
  const { useFixedVelocity, fixedVelocity, useDynamics, selectedDynamic } = playerStore

  if (useFixedVelocity) {
    return fixedVelocity
  }

  if (useDynamics && selectedDynamic) {
    return Math.round(selectedDynamic.range[0] + note.velocity * (selectedDynamic.range[1] - selectedDynamic.range[0]))
  }

  return Math.round(note.velocity * 100) // Convert 0-1 range to 1-100
}
