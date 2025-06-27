/**
 * Service for processing and normalizing rhythm patterns.
 */
export class RhythmPatternProcessor {
  /**
   * Normalizes a rhythm pattern by ensuring it has a proper pattern array and subdivision.
   * @param rhythm - The rhythm pattern to normalize.
   * @returns The normalized rhythm pattern.
   */
  normalizeRhythm(rhythm: any): any {
    if (rhythm.pattern && rhythm.pattern.length > 0) {
      return { ...rhythm, subdivision: rhythm.subdivision || '16n' }
    }

    // Convert 'steps' (note values) to a binary pattern if pattern is missing
    const subdivision = rhythm.subdivision || '16n'

    // Calculate pattern length based on subdivision and steps
    let patternLength = 16 // Default for 16th notes
    if (subdivision === '8n') patternLength = 8
    if (subdivision === '4n') patternLength = 4

    if (!rhythm.steps || rhythm.steps.length === 0) {
      // Create an empty pattern if no steps are provided
      return {
        ...rhythm,
        pattern: new Array(patternLength).fill(0),
        subdivision
      }
    }

    // Convert note steps to binary pattern
    const binaryPattern = this.convertStepsToBinaryPattern(rhythm.steps, patternLength, subdivision)

    return {
      ...rhythm,
      pattern: binaryPattern,
      subdivision
    }
  }

  /**
   * Extracts note steps from a rhythm pattern and total steps.
   * @param rhythmPattern - The rhythm pattern array.
   * @param totalSteps - The total number of steps to generate.
   * @returns An array of step indices where notes should be placed.
   */
  extractNoteSteps(rhythmPattern: (0 | 1)[], totalSteps: number): number[] {
    const noteSteps: number[] = []
    for (let i = 0; i < totalSteps; i++) {
      if (rhythmPattern[i % rhythmPattern.length] === 1) {
        noteSteps.push(i)
      }
    }
    return noteSteps
  }

  /**
   * Converts note duration steps to a binary rhythm pattern
   * @param steps - Array of note durations
   * @param patternLength - Length of the target pattern
   * @param subdivision - The note subdivision
   * @returns Binary pattern array
   */
  private convertStepsToBinaryPattern(steps: string[], patternLength: number, subdivision: string): (0 | 1)[] {
    const pattern: (0 | 1)[] = new Array(patternLength).fill(0)

    // This is a simplified conversion - could be enhanced based on requirements
    let currentPosition = 0

    for (const duration of steps) {
      if (currentPosition < patternLength) {
        pattern[currentPosition] = 1

        // Calculate step increment based on duration
        const stepIncrement = this.calculateStepIncrement(duration, subdivision)
        currentPosition += stepIncrement
      }
    }

    return pattern
  }

  /**
   * Calculates how many steps a duration represents
   * @param duration - Note duration (e.g., '4n', '8n', '16n')
   * @param subdivision - Pattern subdivision
   * @returns Number of steps for the duration
   */
  private calculateStepIncrement(duration: string, subdivision: string): number {
    // Simple mapping - could be enhanced with more sophisticated duration parsing
    const durationMap: Record<string, Record<string, number>> = {
      '16n': { '16n': 1, '8n': 2, '4n': 4, '2n': 8 },
      '8n': { '16n': 0.5, '8n': 1, '4n': 2, '2n': 4 },
      '4n': { '16n': 0.25, '8n': 0.5, '4n': 1, '2n': 2 }
    }

    return Math.max(1, Math.round(durationMap[subdivision]?.[duration] || 1))
  }

  /**
   * Validates a rhythm pattern
   * @param rhythm - The rhythm pattern to validate
   * @returns true if the pattern is valid
   */
  isValidPattern(rhythm: any): boolean {
    if (!rhythm) return false

    // Check if either pattern or steps exist
    const hasPattern = rhythm.pattern && Array.isArray(rhythm.pattern) && rhythm.pattern.length > 0
    const hasSteps = rhythm.steps && Array.isArray(rhythm.steps) && rhythm.steps.length > 0

    return hasPattern || hasSteps
  }

  /**
   * Gets the effective pattern length for a given subdivision
   * @param subdivision - The note subdivision
   * @returns Pattern length in steps
   */
  getPatternLength(subdivision: string): number {
    switch (subdivision) {
      case '4n':
        return 4
      case '8n':
        return 8
      case '16n':
        return 16
      case '32n':
        return 32
      default:
        return 16
    }
  }

  /**
   * Repeats a pattern to fill a specified total length
   * @param pattern - The source pattern
   * @param totalLength - Desired total length
   * @returns Extended pattern
   */
  repeatPattern(pattern: (0 | 1)[], totalLength: number): (0 | 1)[] {
    if (pattern.length === 0) return new Array(totalLength).fill(0)

    const result: (0 | 1)[] = []
    for (let i = 0; i < totalLength; i++) {
      result.push(pattern[i % pattern.length])
    }
    return result
  }
}
