/**
 * Calculates the interval between two notes within a given scale.
 * The interval is returned in "scale steps" (e.g., C to D in C-Major is 1 step).
 *
 * @param noteA - The starting note.
 * @param noteB - The ending note.
 * @param scaleNotes - An array of notes representing the scale.
 * @returns The interval size in scale steps (absolute value).
 */
export function getIntervalInSteps(noteA: string, noteB: string, scaleNotes: readonly string[]): number {
  const indexA = scaleNotes.indexOf(noteA)
  const indexB = scaleNotes.indexOf(noteB)

  if (indexA === -1 || indexB === -1) {
    // One of the notes is not in the scale, cannot determine interval.
    // Return a large value to penalize this heavily.
    return 99
  }

  return Math.abs(indexA - indexB)
}

/**
 * Applies musical rules to weight the probabilities of the next possible notes.
 * - Penalizes large melodic leaps.
 * - Favors stable scale degrees (tonic, dominant, mediant).
 * - Penalizes repeating the same note.
 *
 * @param transitions - A map of possible next notes to their raw counts from the Markov chain.
 * @param currentNote - The note from which the transition originates.
 * @param scaleNotes - An array of notes representing the scale.
 * @param rhythmDegreeWeights - Optional rhythm-specific degree weights.
 * @returns An object containing an array of the notes and an array of their new calculated weights.
 */
export function applyMusicalWeighting(
  transitions: Map<string, number>,
  currentNote: string,
  scaleNotes: readonly string[],
  rhythmDegreeWeights?: Record<number, number>,
  currentChordNotes?: readonly string[]
): { notes: string[]; weights: number[] } {
  const possibleNotes = Array.from(transitions.keys())
  const initialWeights = Array.from(transitions.values())
  const newWeights: number[] = []

  // Use the provided rhythm-specific degree weights, or fall back to the default.
  const degreeWeights = rhythmDegreeWeights || {
    0: 2.0, // 1st (Tonic)
    4: 2.0, // 5th (Dominant)
    2: 1.8, // 3rd (Mediant)
    6: 1.5 // 7th (Leading Tone)
  }

  for (let i = 0; i < possibleNotes.length; i++) {
    const nextNote = possibleNotes[i]
    let weight = initialWeights[i]

    // Rule 1: Interval Weighting
    const interval = getIntervalInSteps(currentNote, nextNote, scaleNotes)
    if (interval > 2) {
      // It's a leap (greater than a 3rd). Penalize it.
      // The larger the leap, the greater the penalty.
      //weight /= interval - 1
      weight *= 0.6
    } else if (interval === 0) {
      // Slightly penalize staying on the same note to avoid getting stuck,
      // but not too harshly, to allow for repeated notes.
      weight *= 0.6
    }

    // Rule 2: Scale-Degree Weighting
    const noteIndex = scaleNotes.indexOf(nextNote)
    const degreeWeight = degreeWeights[noteIndex]

    if (degreeWeight) {
      // Boost weight for favored degrees.
      weight *= degreeWeight
    } else {
      // Slightly penalize non-chord tones (2nd, 4th, 6th) to make them passing notes.
      weight *= 0.8
    }

    // Rule 3: Chord-Tone Weighting
    if (currentChordNotes && currentChordNotes.length > 0) {
      if (currentChordNotes.includes(nextNote)) {
        // Strongly favor notes that are in the current chord.
        weight *= 2.5
      } else {
        // Penalize notes that are not in the current chord.
        weight *= 0.5
      }
    }

    newWeights.push(Math.max(0.1, weight)) // Ensure weight is not zero.
  }

  return { notes: possibleNotes, weights: newWeights }
}
