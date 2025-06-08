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
 * - Favors stable scale degrees (tonic, third, fifth).
 * - Penalizes repeating the same note.
 *
 * @param transitions - A map of possible next notes to their raw counts from the Markov chain.
 * @param currentNote - The note from which the transition originates.
 * @param scaleNotes - An array of notes representing the scale.
 * @returns An object containing an array of the notes and an array of their new calculated weights.
 */
export function applyMusicalWeighting(
  transitions: Map<string, number>,
  currentNote: string,
  scaleNotes: readonly string[]
): { notes: string[]; weights: number[] } {
  const possibleNotes = Array.from(transitions.keys())
  const initialWeights = Array.from(transitions.values())
  const newWeights: number[] = []

  // Define scale degrees to favor (1st, 3rd, 5th).
  const favoredDegrees = [0, 2, 4] // 0-indexed

  for (let i = 0; i < possibleNotes.length; i++) {
    const nextNote = possibleNotes[i]
    let weight = initialWeights[i]

    // Rule 1: Interval Weighting
    const interval = getIntervalInSteps(currentNote, nextNote, scaleNotes)
    if (interval > 2) {
      // It's a leap (greater than a 3rd). Penalize it.
      // The larger the leap, the greater the penalty.
      weight /= interval - 1
    } else if (interval === 0) {
      // Penalize staying on the same note.
      weight *= 0.5
    }

    // Rule 2: Scale-Degree Weighting
    const noteIndex = scaleNotes.indexOf(nextNote)
    if (favoredDegrees.includes(noteIndex)) {
      // Boost weight for tonic, third, fifth.
      weight *= 1.5
    }

    newWeights.push(Math.max(0.1, weight)) // Ensure weight is not zero.
  }

  return { notes: possibleNotes, weights: newWeights }
}
