/**
 * Supported motif patterns for a 4-bar melody.
 * Each character represents a one-bar phrase.
 * - A, B, C, etc., represent different phrases.
 * - Repetition of a character means repetition of the phrase.
 */
export const MOTIF_PATTERNS = ['ABAB', 'ABAC', 'ABCB', 'AABC', 'AAAB', 'AABA'] as const

export type MotifPattern = (typeof MOTIF_PATTERNS)[number]

/**
 * Selects a random motif pattern from the list of available patterns.
 * @returns A random motif pattern string.
 */
export function getRandomMotifPattern(): MotifPattern {
  const randomIndex = Math.floor(Math.random() * MOTIF_PATTERNS.length)
  return MOTIF_PATTERNS[randomIndex]
}
