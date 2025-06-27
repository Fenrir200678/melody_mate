/**
 * MIDI Type Definitions
 * Provides type safety for MIDI operations using midi-writer-js library
 */

/**
 * Represents a MIDI event that can be added to a track
 */
export interface MidiEvent {
  pitch?: string | string[]
  duration?: string
  wait?: string
  velocity?: number
  instrument?: number
}

/**
 * Program Change Event for setting instrument
 */
export interface MidiProgramChangeEvent extends MidiEvent {
  instrument: number
}

/**
 * Note Event for playing notes
 */
export interface MidiNoteEvent extends MidiEvent {
  pitch: string | string[]
  duration: string
  wait?: string
  velocity?: number
}

/**
 * MIDI Track interface based on midi-writer-js Track class
 * Defines all methods used in our codebase
 */
export interface MidiTrack {
  /**
   * Add single event or array of events to the track
   */
  addEvent(event: MidiEvent | MidiEvent[]): void

  /**
   * Set tempo for the track
   * @param bpm - Beats per minute
   * @param tick - Tick position (usually 0 for start)
   */
  setTempo(bpm: number, tick: number): void

  /**
   * Remove all events of a specific type from the track
   * @param eventName - Name of the event type to remove
   */
  removeEventsByName(eventName: string): void
}

/**
 * MIDI Writer interface for generating MIDI files
 */
export interface MidiWriter {
  /**
   * Generate data URI for MIDI file
   */
  dataUri(): string
}

/**
 * Factory interface for creating MIDI writers
 */
export interface MidiWriterConstructor {
  new (tracks: MidiTrack[]): MidiWriter
}

/**
 * Type guard to check if an object is a valid MidiTrack
 */
export function isMidiTrack(obj: unknown): obj is MidiTrack {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as MidiTrack).addEvent === 'function' &&
    typeof (obj as MidiTrack).setTempo === 'function' &&
    typeof (obj as MidiTrack).removeEventsByName === 'function'
  )
}

/**
 * Branded type for MIDI note values (0-127)
 */
export type MidiNote = number & { readonly __brand: 'MidiNote' }

/**
 * Branded type for BPM values
 */
export type BPM = number & { readonly __brand: 'BPM' }

/**
 * Branded type for Velocity values (0-127)
 */
export type Velocity = number & { readonly __brand: 'Velocity' }

/**
 * Create a validated MIDI note
 */
export function createMidiNote(value: number): MidiNote {
  if (value < 0 || value > 127) {
    throw new Error(`Invalid MIDI note value: ${value}. Must be between 0 and 127.`)
  }
  return value as MidiNote
}

/**
 * Create a validated BPM value
 */
export function createBPM(value: number): BPM {
  if (value <= 0 || value > 300) {
    throw new Error(`Invalid BPM value: ${value}. Must be between 1 and 300.`)
  }
  return value as BPM
}

/**
 * Create a validated velocity value
 */
export function createVelocity(value: number): Velocity {
  if (value < 0 || value > 127) {
    throw new Error(`Invalid velocity value: ${value}. Must be between 0 and 127.`)
  }
  return value as Velocity
}
