/**
 * Converts a duration from a custom tick format (e.g., 'T160') to a format Tone.js understands.
 * For 'T<ticks>', it calculates the duration in seconds based on the BPM.
 * Standard notations like '4n' are passed through.
 * @param duration The duration string from the melody object.
 * @param bpm The current tempo.
 * @returns The duration as seconds (number) or a standard time notation (string).
 */
export function convertDurationToToneJsTime(duration: string, bpm: number): number | string {
  if (duration.startsWith('T')) {
    const ticks = parseInt(duration.substring(1), 10)
    if (isNaN(ticks)) {
      return '8n' // Fallback for invalid format
    }
    // Standard is 128 ticks per quarter note (TPQN).
    const secondsPerQuarter = 60 / bpm
    const secondsPerTick = secondsPerQuarter / 128
    return ticks * secondsPerTick
  }
  // Return standard notation like '4n', '8n.' for Tone.js to handle
  return duration
}

/**
 * Maps a note index to the corresponding step index in the rhythm pattern
 * @param noteIndex - The index of the note in the melody
 * @param rhythmPattern - The binary rhythm pattern
 * @returns The step index in the rhythm pattern (accounting for multiple bars)
 */
export function findStepIndexForNote(noteIndex: number, rhythmPattern: (0 | 1)[]): number {
  const patternLength = rhythmPattern.length
  const notesPerBar = rhythmPattern.filter((step) => step === 1).length

  // Calculate which bar this note belongs to
  const barIndex = Math.floor(noteIndex / notesPerBar)
  const noteIndexInBar = noteIndex % notesPerBar

  // Find the step index within the bar
  let noteCount = 0
  for (let stepIndex = 0; stepIndex < patternLength; stepIndex++) {
    if (rhythmPattern[stepIndex] === 1) {
      if (noteCount === noteIndexInBar) {
        // Return the absolute step index across all bars
        return barIndex * patternLength + stepIndex
      }
      noteCount++
    }
  }
  return -1 // Fallback
}
