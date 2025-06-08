import type { Melody } from '@/models'
import MidiWriter from 'midi-writer-js'

/**
 * Converts the internal Note duration format to the format expected by midi-writer-js.
 * @param duration - The duration in the format '4n', '8n', etc.
 * @returns The duration in the format '4', '8', etc.
 */
function formatDuration(duration: string): string {
  return duration.endsWith('n') ? duration.slice(0, -1) : duration
}

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

  // 3. Add notes to the track
  const noteEvents = melody.notes.map(
    (note) =>
      new MidiWriter.NoteEvent({
        pitch: [note.pitch],
        duration: formatDuration(note.duration),
        velocity: Math.round(note.velocity * 100) // Convert 0-1 range to 1-100
      })
  )
  track.addEvent(noteEvents, () => ({
    sequential: true
  }))

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
