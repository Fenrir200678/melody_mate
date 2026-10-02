export type MidiTrackKey = 'lead' | 'chord'
export type OutputRouteMode = 'internal' | 'midi' | 'both'

export interface DesiredMidiPort {
  id: string
  name: string | null
  manufacturer: string | null
}

export interface MidiTrackRoute {
  mode: OutputRouteMode
  port: DesiredMidiPort | null
  channel: number
  offsetMs: number
  sendPreviews: boolean
}

export type MidiOutputSettings = Record<MidiTrackKey, MidiTrackRoute>

export type MidiNoteSource =
  | { kind: 'melody'; noteId: string }
  | { kind: 'chord'; chordId: string; midi: number }
  | { kind: 'preview'; sourceId: string }

export interface MidiNoteIntent {
  track: MidiTrackKey
  source: MidiNoteSource
  sessionId: string
  generation: number
  loopIteration: number
  eventId: string
  portId: string
  channel: number
  midi: number
  velocity: number
  /** Planned timestamps on the performance clock, in milliseconds. */
  onTimeMs: number
  offTimeMs: number
}

export type MidiMessageBytes = [status: number, pitch: number, velocity: number]
export type MidiResult<T> = { ok: true; value: T } | { ok: false; error: string }

export interface MidiSourceNote {
  midi: number
  source: MidiNoteSource
}

export interface MidiPitchConversion {
  status: 'valid' | 'partial' | 'invalid'
  midis: number[]
  rejectedPitches: string[]
}
