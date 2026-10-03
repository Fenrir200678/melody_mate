import * as Tone from 'tone'
import { DEFAULT_MIDI_QUEUE_TIMING } from '../../config/defaults'
import { normalizedVelocityToMidi } from '../../core/midi/live-messages'
import { MidiOutputSettingsSchema } from '../../core/midi/output.schema'
import type { MidiSourceNote, MidiTrackKey, MidiOutputSettings } from '../../core/midi/output.types'
import { getMidiDispatchAdvanceSeconds } from '../../core/transport/output-gate'
import { validateMidiAdvanceBudget } from '../../core/transport/output-timing'
import type { MidiOutputSession } from './output-session'

export interface MidiDispatchEvent {
  track: MidiTrackKey
  generation: number
  midiNotes: readonly MidiSourceNote[]
  velocity: number
  onTimeSeconds: number
}

export function enqueueMidiOutput(
  runtime: { sessionId: string; midi: Pick<MidiOutputSession, 'enqueue'>; getSettings(): MidiOutputSettings },
  event: MidiDispatchEvent,
  offTimeSeconds: number,
  loopIteration: number,
  sequence: number
): void {
  const route = MidiOutputSettingsSchema.parse(runtime.getSettings())[event.track]
  const context = Tone.getContext()
  if (!('updateInterval' in context) || typeof context.updateInterval !== 'number')
    throw new Error('MIDI output requires a Tone context with a known scheduling interval.')
  const advance = Math.min(
    getMidiDispatchAdvanceSeconds(context.lookAhead, context.updateInterval),
    event.onTimeSeconds - Tone.immediate()
  )
  if (
    !validateMidiAdvanceBudget(
      route.offsetMs,
      advance,
      DEFAULT_MIDI_QUEUE_TIMING.pumpIntervalMs,
      DEFAULT_MIDI_QUEUE_TIMING.cancelGuardMs
    )
  )
    throw new RangeError('MIDI route offset exceeds the actual Tone dispatch advance.')
  for (const note of event.midiNotes) {
    runtime.midi.enqueue({
      track: event.track,
      source: note.source,
      sessionId: runtime.sessionId,
      generation: event.generation,
      loopIteration,
      eventId: `${runtime.sessionId}:${event.track}:${event.generation}:${loopIteration}:${sequence}:${note.midi}`,
      channel: route.channel,
      midi: note.midi,
      velocity: normalizedVelocityToMidi(event.velocity),
      onTimeSeconds: event.onTimeSeconds,
      offTimeSeconds,
      routeOffsetMs: route.offsetMs
    })
  }
}
