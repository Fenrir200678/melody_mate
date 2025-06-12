import type { Melody } from '@/ts/models'
import MidiWriter from 'midi-writer-js'

/**
 * Converts a melody object into a MIDI file and triggers a download.
 * @param melody - The melody to be saved.
 * @param bpm - The tempo of the melody in beats per minute.
 * @param fileName - The desired name for the MIDI file.
 */
export function saveAsMidi(melody: Melody, bpm: number, fileName = 'melody.mid'): void {
  if (!melody.notes.length) {
    console.warn('Cannot save an empty melody.')
    return
  }

  // 1. Create a new track
  const track = new MidiWriter.Track()

  // 2. Set tempo
  track.setTempo(bpm)

  // 3. Add notes to the track, handling rests correctly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noteEvents: any[] = []
  let pendingWaitTicks = 0

  melody.notes.forEach((note) => {
    if (note.pitch) {
      // This is a note. Create an event with the accumulated wait time from previous rests.
      const event = new MidiWriter.NoteEvent({
        pitch: [note.pitch],
        duration: note.duration, // Already in 'Txxx' format from MelodyService
        wait: `T${pendingWaitTicks}`,
        velocity: Math.round(note.velocity * 100) // Convert 0-1 range to 1-100
      })
      noteEvents.push(event)
      pendingWaitTicks = 0 // Reset wait time after applying it to a note
    } else {
      // This is a rest. Add its duration to the pending wait time for the next note.
      const restTicks = parseInt(note.duration.substring(1)) || 0
      pendingWaitTicks += restTicks
    }
  })

  track.addEvent(noteEvents)

  // 4. Generate the MIDI file and trigger download
  const writer = new MidiWriter.Writer([track])
  const dataUri = writer.dataUri()

  const link = document.createElement('a')
  link.href = dataUri
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
