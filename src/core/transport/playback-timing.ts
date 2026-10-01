/**
 * Normalizes a pitch to ensure an octave number is attached (e.g. 'C' -> 'C3', 'F#4' -> 'F#4').
 */
export function normalizePitchOctave(pitch: string, defaultOctave = 3): string {
  return /\d$/.test(pitch) ? pitch : `${pitch}${defaultOctave}`
}

/**
 * Computes step duration in seconds for a given BPM and subdivision.
 */
export function getStepDurationSeconds(bpm: number, subdivision = '16n'): number {
  const beatDuration = 60 / Math.max(20, bpm)
  switch (subdivision) {
    case '4n':
      return beatDuration
    case '8n':
      return beatDuration / 2
    case '32n':
      return beatDuration / 8
    case '16n':
    default:
      return beatDuration / 4
  }
}

/**
 * Converts a Tone duration notation or a raw number into seconds, clamped to an audible minimum.
 */
export function durationToSeconds(duration: string | number, bpm = 120): number {
  if (typeof duration === 'number') return Math.max(0.05, duration)
  try {
    const match = /^(\d+(?:\.\d+)?)(n|m)$/.exec(duration)
    if (!match) throw new Error('Unsupported duration')
    const value = Number(match[1])
    return Math.max(0.05, match[2] === 'm' ? (240 / bpm) * value : 240 / bpm / value)
  } catch {
    return Math.max(0.05, getStepDurationSeconds(bpm, '8n'))
  }
}
