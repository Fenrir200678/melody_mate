import { Note } from 'tonal'
import { getGroovedLeadStarts, getGroovedStartStep } from '../rhythm/groove'
import { STEPS_PER_BAR } from '../schemas/project.schema'
import { PlaybackSnapshotSchema, type PluginSession } from './session'

export function buildPlaybackSnapshot(session: PluginSession) {
  const { project, melody, harmony, output } = session
  const lengthPpq = (project.bars * STEPS_PER_BAR) / 4
  const notes: {
    startPpq: number
    endPpq: number
    pitch: number
    velocity: number
    channel: number
    track: 'melody' | 'chords'
  }[] = []
  const lead = melody.notes.filter((note) => !note.isMuted)
  const starts = getGroovedLeadStarts(lead, project)
  const append = (startStep: number, duration: number, pitch: number, velocity: number, track: 'melody' | 'chords') => {
    const channel = track === 'melody' ? output.melodyChannel : output.chordsChannel
    const startPpq = startStep / 4
    if (channel === 0 || startPpq >= lengthPpq) return
    notes.push({
      startPpq,
      endPpq: Math.min(lengthPpq, startPpq + duration / 4),
      pitch,
      velocity,
      channel,
      track
    })
  }
  if (output.enabled) {
    for (const note of lead)
      append(starts.get(note.id) ?? note.step, note.durationSteps, note.midi, note.velocity, 'melody')
    if (harmony.useChords && !harmony.isMuted) {
      for (const chord of harmony.chords) {
        const start = getGroovedStartStep(chord.startBar * STEPS_PER_BAR, chord.id, project)
        for (const pitch of chord.voicing) {
          const midi = Note.midi(pitch)
          if (midi === null) throw new Error('Invalid chord pitch in plugin snapshot.')
          append(
            start,
            chord.durationBars * STEPS_PER_BAR,
            midi,
            Math.max(1, Math.round(harmony.backingVolume * 127)),
            'chords'
          )
        }
      }
    }
  }
  return PlaybackSnapshotSchema.parse({
    lengthPpq,
    repeat: output.repeat,
    notes: notes.sort((a, b) => a.startPpq - b.startPpq || a.pitch - b.pitch)
  })
}
