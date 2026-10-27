import { buildMidiBytes, generateMidiFilename } from '../midi/midi-exporter'
import type { PluginSession } from './session'

export type PluginMidiTrack = 'melody' | 'chords'

export function buildPluginMidiDragExport(session: PluginSession, track: PluginMidiTrack) {
  const { project, melody, harmony } = session
  const chords = track === 'chords'
  return {
    bytes: buildMidiBytes(melody.notes, harmony.chords, project.bpm, {
      mode: chords ? 'chords-only' : 'melody-only',
      ...project
    }),
    filename: generateMidiFilename({ ...project, mode: chords ? 'chords-only' : 'melody-only' })
  }
}
