import type { Melody } from '@/ts/models'
import MidiWriter from 'midi-writer-js'

/**
 * Converts a melody object into a MIDI file and triggers a download.
 * @param melody - The melody to be saved.
 * @param bpm - The tempo of the melody in beats per minute.
 * @param fileName - The desired name for the MIDI file.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateMidiFile(melody: Melody, bpm: number, instrument: number, track: any): string {
  if (!melody.notes.length) {
    console.warn('Cannot save an empty melody.')
    return ''
  }

  track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument }))
  track.setTempo(bpm, 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noteEvents: any[] = []
  let pendingWaitTicks = 0

  melody.notes.forEach((note) => {
    if (note.pitch) {
      // regular note
      const event = new MidiWriter.NoteEvent({
        pitch: [note.pitch],
        duration: note.duration,
        wait: `T${pendingWaitTicks}`,
        velocity: Math.round(note.velocity * 100) // Convert 0-1 range to 1-100
      })
      noteEvents.push(event)
      pendingWaitTicks = 0 // Reset wait time after applying it to a note
    } else {
      // rest
      const restTicks = parseInt(note.duration.substring(1)) || 0
      pendingWaitTicks += restTicks
    }
  })

  track.addEvent(noteEvents)
  const writer = new MidiWriter.Writer([track])
  const dataUri = writer.dataUri()
  return dataUri
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function downloadMidiFile(dataUri: string, fileName: string, track: any): void {
  track.removeEventsByName('ProgramChangeEvent')

  const link = document.createElement('a')
  link.href = dataUri
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
