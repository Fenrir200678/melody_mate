import type { AppNote, Melody } from '@/ts/models'
import type { MidiTrack } from '@/ts/types/midi.types'
import type { BaseService } from '@/ts/types/services.types'
import MidiWriter from 'midi-writer-js'
import { usePlayerStore } from '@/stores/player.store'
import { noteNameToMidi } from '@/utils/scales'

/**
 * Safe MIDI Note representation with validation
 */
interface SafeMidiNote {
  pitch: string
  duration: string
  velocity: number
  startTime?: number
  isValid: boolean
}

/**
 * MIDI Conversion Input/Output types
 */
interface MidiConversionInput {
  melody: Melody
  track: MidiTrack
}

interface MidiConversionOutput {
  dataUri: string
  events: any[]
  validNotes: number
  filteredNotes: number
}

/**
 * Safe MIDI Service with strict type safety and robust error handling
 * Implements BaseService contract pattern from Phase 3
 */
export class SafeMidiService implements BaseService<MidiConversionInput, MidiConversionOutput> {
  /**
   * Validates input for MIDI conversion
   */
  validate(input: unknown): input is MidiConversionInput {
    if (typeof input !== 'object' || input === null) return false
    const typed = input as MidiConversionInput

    // Validate melody
    if (!typed.melody || !typed.melody.notes || !Array.isArray(typed.melody.notes)) {
      return false
    }

    // Validate track (duck typing for external library)
    if (!typed.track || typeof typed.track.addEvent !== 'function') {
      return false
    }

    return true
  }

  /**
   * Process MIDI conversion (BaseService contract implementation)
   */
  async process(input: MidiConversionInput): Promise<MidiConversionOutput> {
    if (!this.validate(input)) {
      throw new Error('Invalid MIDI conversion input')
    }

    const { melody, track } = input
    return this.convertMelodyToMidi(melody, track)
  }

  /**
   * Main MIDI conversion method - refactored from original MidiService
   */
  private convertMelodyToMidi(melody: Melody, track: MidiTrack): MidiConversionOutput {
    if (!melody.notes.length) {
      console.warn('SafeMidiService: Cannot convert empty melody')
      return {
        dataUri: '',
        events: [],
        validNotes: 0,
        filteredNotes: 0
      }
    }

    const playerStore = usePlayerStore()
    const { bpm, selectedInstrument: instrument } = playerStore

    // Setup track
    track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: instrument || 0 }))
    track.setTempo(bpm || 120, 0)

    // Sanitize and validate notes
    const sanitizedNotes = this.sanitizeNotes(melody.notes)
    const validNotes = sanitizedNotes.filter((note) => note.isValid)

    // Convert to MIDI events
    const noteEvents = this.convertToMidiEvents(validNotes)

    // Filter empty events
    const filteredEvents = noteEvents.filter((event) =>
      event && Array.isArray(event.pitch) ? event.pitch.length > 0 : true
    )

    // Add events to track
    if (filteredEvents.length > 0) {
      track.addEvent(filteredEvents)
    }

    // Generate MIDI data URI
    const writer = new MidiWriter.Writer([track])
    const dataUri = writer.dataUri()

    return {
      dataUri,
      events: filteredEvents,
      validNotes: validNotes.length,
      filteredNotes: melody.notes.length - validNotes.length
    }
  }

  /**
   * Sanitize AppNotes to SafeMidiNotes with validation
   */
  private sanitizeNotes(notes: AppNote[]): SafeMidiNote[] {
    // Remove trailing rests
    const trimmedNotes = [...notes]
    while (trimmedNotes.length > 0 && trimmedNotes[trimmedNotes.length - 1].pitch === null) {
      trimmedNotes.pop()
    }

    return trimmedNotes.map((note) => this.convertToSafeMidiNote(note))
  }

  /**
   * Convert AppNote to SafeMidiNote with validation
   */
  private convertToSafeMidiNote(note: AppNote): SafeMidiNote {
    const isValidPitch = this.validatePitch(note.pitch)
    const isValidDuration = this.validateDuration(note.duration)
    const isValidVelocity = this.validateVelocity(note.velocity)

    return {
      pitch: note.pitch || '',
      duration: note.duration,
      velocity: note.velocity,
      isValid: isValidPitch && isValidDuration && isValidVelocity
    }
  }

  /**
   * Validate MIDI pitch
   */
  private validatePitch(pitch: string | null): boolean {
    if (pitch === null) return true // Rest is valid
    if (typeof pitch !== 'string') return false
    if (pitch === '0' || pitch === '') return false // Invalid pitches

    // Additional pitch validation could be added here
    return pitch.length > 0
  }

  /**
   * Validate MIDI duration
   */
  private validateDuration(duration: string): boolean {
    if (typeof duration !== 'string') return false
    if (!duration.startsWith('T')) return false

    const ticks = parseInt(duration.substring(1))
    return !isNaN(ticks) && ticks > 0
  }

  /**
   * Validate velocity
   */
  private validateVelocity(velocity: number): boolean {
    return typeof velocity === 'number' && velocity >= 0 && velocity <= 1
  }

  /**
   * Convert SafeMidiNotes to MIDI events
   */
  private convertToMidiEvents(notes: SafeMidiNote[]): any[] {
    const noteEvents: any[] = []
    let pendingWaitTicks = 0

    notes.forEach((note) => {
      if (note.pitch && note.pitch.length > 0 && note.isValid) {
        // Regular note - convert to MIDI number
        try {
          // Add default octave if note name doesn't have one
          const noteWithOctave =
            note.pitch.includes('0') ||
            note.pitch.includes('1') ||
            note.pitch.includes('2') ||
            note.pitch.includes('3') ||
            note.pitch.includes('4') ||
            note.pitch.includes('5') ||
            note.pitch.includes('6') ||
            note.pitch.includes('7') ||
            note.pitch.includes('8') ||
            note.pitch.includes('9')
              ? note.pitch
              : `${note.pitch}4` // Default octave 4

          const midiNumber = noteNameToMidi(noteWithOctave)

          // Validate MIDI range for html-midi-player (21-108)
          if (midiNumber < 21 || midiNumber > 108) {
            console.warn(
              `SafeMidiService: MIDI number ${midiNumber} outside valid range (21-108), skipping note ${noteWithOctave}`
            )
            return
          }

          const event = new MidiWriter.NoteEvent({
            pitch: [midiNumber], // Use MIDI number instead of string
            duration: note.duration,
            wait: `T${pendingWaitTicks}`,
            velocity: this.calculateVelocity(note)
          })
          pendingWaitTicks = 0
          noteEvents.push(event)
        } catch (error) {
          console.warn(`SafeMidiService: Failed to convert note "${note.pitch}" to MIDI number:`, error)
          // Skip invalid notes
        }
      } else if (!note.pitch) {
        // Rest - add to pending wait time
        const restTicks = parseInt(note.duration.substring(1)) || 0
        pendingWaitTicks += restTicks
      }
      // Invalid notes are skipped
    })

    return noteEvents
  }

  /**
   * Calculate velocity from SafeMidiNote
   */
  private calculateVelocity(note: SafeMidiNote): number {
    const playerStore = usePlayerStore()
    const { useFixedVelocity, fixedVelocity, useDynamics, selectedDynamic } = playerStore

    if (useFixedVelocity) {
      return fixedVelocity || 50
    }

    if (useDynamics && selectedDynamic) {
      return Math.round(
        selectedDynamic.range[0] + note.velocity * (selectedDynamic.range[1] - selectedDynamic.range[0])
      )
    }

    return Math.round(note.velocity * 100) // Convert 0-1 range to 1-100
  }

  /**
   * Public API method for melody conversion
   */
  async convertMelody(melody: Melody, track: MidiTrack): Promise<string> {
    const result = await this.process({ melody, track })
    return result.dataUri
  }

  /**
   * Health check for service dependencies
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check if MidiWriter is available
      const testTrack = new MidiWriter.Track()
      return testTrack !== null
    } catch {
      return false
    }
  }
}
