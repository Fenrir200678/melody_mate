import { Note } from 'tonal'
import { DEFAULT_MIDI_NOTE_OFF_VELOCITY } from '../../config/defaults'
import type { AppNote } from '../schemas/note.schema'
import type { ChordEvent } from '../schemas/chord.schema'
import { MidiChannelSchema, MidiPitchSchema, MidiOnVelocitySchema, MidiOffVelocitySchema } from './output.schema'
import type { MidiMessageBytes, MidiPitchConversion, MidiResult, MidiSourceNote } from './output.types'

function encodeNote(status: number, channel: number, midi: number, velocity: number): MidiResult<MidiMessageBytes> {
  if (!MidiChannelSchema.safeParse(channel).success) return { ok: false, error: 'Invalid MIDI channel.' }
  if (!MidiPitchSchema.safeParse(midi).success) return { ok: false, error: 'Invalid MIDI pitch.' }
  const velocitySchema = status === 0x90 ? MidiOnVelocitySchema : MidiOffVelocitySchema
  if (!velocitySchema.safeParse(velocity).success) return { ok: false, error: 'Invalid MIDI velocity.' }
  return { ok: true, value: [status | (channel - 1), midi, velocity] }
}

export function encodeNoteOn(channel: number, midi: number, velocity: number): MidiResult<MidiMessageBytes> {
  return encodeNote(0x90, channel, midi, velocity)
}

export function encodeNoteOff(
  channel: number,
  midi: number,
  velocity = DEFAULT_MIDI_NOTE_OFF_VELOCITY
): MidiResult<MidiMessageBytes> {
  return encodeNote(0x80, channel, midi, velocity)
}

export function melodyMidiNote(note: Pick<AppNote, 'id' | 'midi'>): MidiResult<MidiSourceNote> {
  if (!note.id.trim() || !MidiPitchSchema.safeParse(note.midi).success) {
    return { ok: false, error: 'Invalid melody note identity or MIDI pitch.' }
  }
  return { ok: true, value: { midi: note.midi, source: { kind: 'melody', noteId: note.id } } }
}

export function convertMidiPitches(pitches: readonly string[]): MidiPitchConversion {
  const midis = new Set<number>()
  const rejectedPitches: string[] = []
  for (const pitch of pitches) {
    const midi = Note.midi(pitch)
    if (midi === null || !MidiPitchSchema.safeParse(midi).success) rejectedPitches.push(pitch)
    else midis.add(midi)
  }
  return {
    status: midis.size === 0 ? 'invalid' : rejectedPitches.length ? 'partial' : 'valid',
    midis: [...midis].sort((a, b) => a - b),
    rejectedPitches
  }
}

export function chordMidiNotes(chord: Pick<ChordEvent, 'id' | 'voicing'>): MidiResult<{
  notes: MidiSourceNote[]
  conversion: MidiPitchConversion
}> {
  if (!chord.id.trim()) return { ok: false, error: 'Invalid chord identity.' }
  const conversion = convertMidiPitches(chord.voicing)
  return {
    ok: true,
    value: {
      conversion,
      notes: conversion.midis.map((midi) => ({ midi, source: { kind: 'chord', chordId: chord.id, midi } }))
    }
  }
}
