import type { Melody } from '@/ts/models'

/**
 * Service responsible for validating generated melodies
 */
export class MelodyValidator {
  /**
   * Validates a generated melody and ensures it meets basic requirements
   * @param melody - The melody to validate
   * @returns The validated melody (potentially modified)
   */
  validate(melody: Melody): Melody {
    if (!melody || !melody.notes) {
      return { notes: [] }
    }

    // Filter out invalid notes
    const validNotes = melody.notes.filter((note) => {
      // Allow rests (pitch: null)
      if (note.pitch === null) return true

      // Validate pitch format
      if (typeof note.pitch !== 'string') return false

      // Validate duration
      if (!note.duration || typeof note.duration !== 'string') return false

      // Validate velocity
      if (typeof note.velocity !== 'number' || note.velocity < 0 || note.velocity > 1) return false

      return true
    })

    return {
      ...melody,
      notes: validNotes
    }
  }

  /**
   * Checks if a melody is valid
   * @param melody - The melody to check
   * @returns true if the melody is valid
   */
  isValid(melody: Melody): boolean {
    if (!melody || !melody.notes || !Array.isArray(melody.notes)) {
      return false
    }

    return melody.notes.every((note) => {
      // Allow rests
      if (note.pitch === null) return true

      // Check pitch, duration, and velocity
      return (
        typeof note.pitch === 'string' &&
        typeof note.duration === 'string' &&
        typeof note.velocity === 'number' &&
        note.velocity >= 0 &&
        note.velocity <= 1
      )
    })
  }
}
