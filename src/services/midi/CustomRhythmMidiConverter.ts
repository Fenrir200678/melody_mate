import type { AppNote, Melody } from '@/ts/models'
import type { CustomRhythm } from '@/ts/types/rhythm.types'
import type { ProcessorService } from '@/ts/types/services.types'
import { SafeMidiService } from './SafeMidiService'

/**
 * Custom Rhythm MIDI Conversion Input
 */
interface CustomRhythmMidiInput {
  customRhythm: CustomRhythm
  melody: Melody
  stepsPerBar: number
  subdivision: string
}

/**
 * Custom Rhythm MIDI Conversion Output
 */
interface CustomRhythmMidiOutput {
  processedMelody: Melody
  validationResult: {
    originalNotes: number
    processedNotes: number
    filteredNotes: number
    hasInvalidPitches: boolean
  }
}

/**
 * Custom Rhythm MIDI Converter Service
 * Specialized service for converting Custom Rhythm events to MIDI-safe AppNotes
 * Addresses the specific "Pitch 0" issue with custom rhythms
 */
export class CustomRhythmMidiConverter implements ProcessorService<CustomRhythmMidiInput, CustomRhythmMidiOutput> {
  private safeMidiService: SafeMidiService

  constructor() {
    this.safeMidiService = new SafeMidiService()
  }

  /**
   * Validates input for custom rhythm MIDI conversion
   */
  validate(input: unknown): input is CustomRhythmMidiInput {
    if (typeof input !== 'object' || input === null) return false
    const typed = input as CustomRhythmMidiInput

    return (
      Array.isArray(typed.customRhythm) &&
      typed.melody &&
      Array.isArray(typed.melody.notes) &&
      typeof typed.stepsPerBar === 'number' &&
      typeof typed.subdivision === 'string'
    )
  }

  /**
   * Process custom rhythm melody for MIDI conversion
   */
  async process(input: CustomRhythmMidiInput): Promise<CustomRhythmMidiOutput> {
    if (!this.validate(input)) {
      throw new Error('Invalid custom rhythm MIDI conversion input')
    }

    const { melody, customRhythm } = input
    // Note: stepsPerBar and subdivision available for future rhythm timing validation
    const originalNotesCount = melody.notes.length

    // Step 1: Validate and sanitize notes against custom rhythm events
    const sanitizedNotes = this.sanitizeCustomRhythmNotes(melody.notes, customRhythm)

    // Step 2: Remove invalid pitches specifically for MIDI
    const midiSafeNotes = this.createMidiSafeNotes(sanitizedNotes)

    // Step 3: Ensure no trailing rests that could cause "Pitch 0" issues
    const trimmedNotes = this.removeTrailingRests(midiSafeNotes)

    // Step 4: Apply custom rhythm timing validation
    const validatedNotes = this.validateCustomRhythmTiming(trimmedNotes, customRhythm)

    const processedMelody: Melody = { notes: validatedNotes }

    return {
      processedMelody,
      validationResult: {
        originalNotes: originalNotesCount,
        processedNotes: validatedNotes.length,
        filteredNotes: originalNotesCount - validatedNotes.length,
        hasInvalidPitches: this.hasInvalidPitches(melody.notes)
      }
    }
  }

  /**
   * Transform input to output (ProcessorService contract)
   */
  transform(input: CustomRhythmMidiInput): CustomRhythmMidiOutput {
    // For synchronous transformation, we'll implement a sync version
    const { melody, customRhythm } = input
    const sanitizedNotes = this.sanitizeCustomRhythmNotes(melody.notes, customRhythm)
    const trimmedNotes = this.removeTrailingRests(sanitizedNotes)

    return {
      processedMelody: { notes: trimmedNotes },
      validationResult: {
        originalNotes: melody.notes.length,
        processedNotes: trimmedNotes.length,
        filteredNotes: melody.notes.length - trimmedNotes.length,
        hasInvalidPitches: this.hasInvalidPitches(melody.notes)
      }
    }
  }

  /**
   * Check if input can be processed
   */
  canProcess(input: unknown): boolean {
    return this.validate(input)
  }

  /**
   * Sanitize notes based on custom rhythm events
   */
  private sanitizeCustomRhythmNotes(notes: AppNote[], customRhythm: CustomRhythm): AppNote[] {
    const sanitized: AppNote[] = []

    for (let i = 0; i < Math.min(notes.length, customRhythm.length); i++) {
      const note = notes[i]
      const rhythmEvent = customRhythm[i]

      // Skip notes that don't align with rhythm events
      if (!rhythmEvent) continue

      // Handle rest events
      if (rhythmEvent.isRest) {
        sanitized.push({
          pitch: null,
          duration: note.duration,
          velocity: 0
        })
        continue
      }

      // Validate and clean note pitches
      if (this.isValidNotePitch(note.pitch)) {
        sanitized.push({
          pitch: note.pitch,
          duration: note.duration,
          velocity: note.velocity
        })
      } else {
        console.warn(`CustomRhythmMidiConverter: Skipping invalid pitch "${note.pitch}" at index ${i}`)
      }
    }

    return sanitized
  }

  /**
   * Create MIDI-safe notes with additional validation
   */
  private createMidiSafeNotes(notes: AppNote[]): AppNote[] {
    return notes.filter((note) => {
      // Filter out invalid pitches that could cause "Pitch 0" errors
      if (note.pitch === null) return true // Rests are valid
      if (typeof note.pitch !== 'string') return false
      if (note.pitch === '0' || note.pitch === '') return false
      if (!this.isValidMidiPitch(note.pitch)) return false

      return true
    })
  }

  /**
   * Remove trailing rests to prevent leftover wait time issues
   */
  private removeTrailingRests(notes: AppNote[]): AppNote[] {
    const trimmed = [...notes]
    while (trimmed.length > 0 && trimmed[trimmed.length - 1].pitch === null) {
      trimmed.pop()
    }
    return trimmed
  }

  /**
   * Validate timing against custom rhythm events
   */
  private validateCustomRhythmTiming(notes: AppNote[], customRhythm: CustomRhythm): AppNote[] {
    // Ensure notes don't exceed rhythm event count
    const maxNotes = customRhythm.length
    if (notes.length > maxNotes) {
      console.warn(`CustomRhythmMidiConverter: Trimming ${notes.length - maxNotes} notes to match rhythm events`)
      return notes.slice(0, maxNotes)
    }

    return notes
  }

  /**
   * Check if melody has invalid pitches
   */
  private hasInvalidPitches(notes: AppNote[]): boolean {
    return notes.some(
      (note) => note.pitch !== null && (note.pitch === '0' || note.pitch === '' || !this.isValidMidiPitch(note.pitch))
    )
  }

  /**
   * Validate note pitch for music theory
   */
  private isValidNotePitch(pitch: string | null): boolean {
    if (pitch === null) return true // Rest is valid
    if (typeof pitch !== 'string') return false
    if (pitch === '0' || pitch === '') return false

    // Basic music note validation (C, D, E, F, G, A, B with optional sharps/flats)
    const notePattern = /^[A-G][#b]?[0-9]?$/
    return notePattern.test(pitch)
  }

  /**
   * Validate MIDI pitch compatibility
   */
  private isValidMidiPitch(pitch: string): boolean {
    if (!this.isValidNotePitch(pitch)) return false

    // Additional MIDI-specific validation
    try {
      // If we had a MIDI library to validate pitch ranges, we'd use it here
      // For now, basic validation suffices
      return pitch.length > 0 && pitch !== '0'
    } catch {
      return false
    }
  }

  /**
   * Get conversion statistics
   */
  getConversionStats(input: CustomRhythmMidiInput): Promise<{
    totalNotes: number
    validNotes: number
    filteredNotes: number
    rhythmEvents: number
    hasInvalidPitches: boolean
  }> {
    const { melody, customRhythm } = input
    const validNotes = melody.notes.filter((note) => this.isValidNotePitch(note.pitch))

    return Promise.resolve({
      totalNotes: melody.notes.length,
      validNotes: validNotes.length,
      filteredNotes: melody.notes.length - validNotes.length,
      rhythmEvents: customRhythm.length,
      hasInvalidPitches: this.hasInvalidPitches(melody.notes)
    })
  }

  /**
   * Health check for converter dependencies
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.safeMidiService.healthCheck()
    } catch {
      return false
    }
  }
}
