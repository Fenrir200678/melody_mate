/**
 * Converts a duration from midi-writer-js tick format (e.g., 'T128')
 * to standard musical notation (e.g., '4n').
 * This is primarily for display purposes.
 * @param duration - The duration string in 'Txxx' format.
 * @returns The duration in standard notation, or the original string if conversion is not possible.
 */
export function convertTicksToNotation(duration: string): string {
  if (!duration?.startsWith('T')) {
    return duration
  }

  const ticks = parseInt(duration.substring(1), 10)
  if (isNaN(ticks)) {
    return duration // Invalid format
  }

  // Based on midi-writer-js: 128 ticks per quarter note
  const TICKS_TO_NOTATION: Record<number, string> = {
    512: '1n', // Whole note
    384: '2n.', // Dotted half note
    256: '2n', // Half note
    192: '4n.', // Dotted quarter note
    128: '4n', // Quarter note
    96: '8n.', // Dotted eighth note
    64: '8n', // Eighth note
    48: '16n.', // Dotted sixteenth note
    32: '16n', // Sixteenth note
    16: '32n', // Thirty-second note
    8: '64n' // Sixty-fourth note
  }

  return TICKS_TO_NOTATION[ticks] || duration
}
