import { Note } from 'tonal'

export { generateScaleTrainingSequences } from './markov-training'

export type MarkovTable = Map<string, Map<string, number>>

const BACKOFF_STRENGTH = 4

/**
 * Normalizes pitch strings to pitch class representation (e.g. 'C#4' -> 'C#').
 */
function toPitchClass(pitch: string): string {
  return Note.pitchClass(pitch) || pitch.trim()
}

/**
 * Builds a multi-order Markov transition table from an array of pitch sequences.
 * Populates n-gram prefixes for all orders from 1 up to the specified order,
 * as well as order-0 unigrams (key: '') to facilitate seamless backoff.
 *
 * @param sequences - Array of pitch sequences (e.g. [['C', 'D', 'E', 'C'], ...])
 * @param order - Maximum n-gram context order (typically 1 to 4)
 * @returns Populated MarkovTable
 */
export function buildMarkovTable(sequences: string[][], order: number): MarkovTable {
  const table: MarkovTable = new Map()
  const clampedOrder = Math.max(1, Math.min(4, Math.round(order)))

  function increment(prefixKey: string, nextPitch: string): void {
    let inner = table.get(prefixKey)
    if (!inner) {
      inner = new Map<string, number>()
      table.set(prefixKey, inner)
    }
    inner.set(nextPitch, (inner.get(nextPitch) ?? 0) + 1)
  }

  for (const seq of sequences) {
    if (!seq || seq.length === 0) continue

    const normalizedSeq = seq.map(toPitchClass)

    for (let i = 0; i < normalizedSeq.length; i++) {
      const nextPitch = normalizedSeq[i]

      // Order-0: Global unigram frequency
      increment('', nextPitch)

      // Orders 1 .. clampedOrder
      for (let k = 1; k <= clampedOrder; k++) {
        if (i - k >= 0) {
          const prefix = normalizedSeq.slice(i - k, i).join('|')
          increment(prefix, nextPitch)
        }
      }
    }
  }

  return table
}

/**
 * Interpolates every observed context with its shorter suffix. A context with
 * only one observation cannot overwhelm the lower-order evidence.
 *
 * @param history - Array of previous pitch strings
 * @param nextPitch - Pitch candidate to evaluate
 * @param table - Populated MarkovTable
 * @param order - Max order to query
 * @returns Probability between 0.0 and 1.0
 */
export function getMarkovProbability(
  history: string[],
  nextPitch: string,
  table: MarkovTable,
  order: number = 2
): number {
  if (!table || table.size === 0) {
    return 0
  }

  const targetPc = toPitchClass(nextPitch)
  const maxOrder = Math.max(1, Math.min(4, Math.round(order)))
  const recentHistory = history.slice(-maxOrder).map(toPitchClass)
  const unigrams = table.get('')
  if (!unigrams) {
    return 0
  }

  let totalCount = 0
  for (const count of unigrams.values()) {
    totalCount += count
  }
  if (totalCount === 0) return 0

  let probability = (unigrams.get(targetPc) ?? 0) / totalCount
  for (let k = 1; k <= recentHistory.length; k++) {
    const prefix = recentHistory.slice(-k).join('|')
    const transitions = table.get(prefix)
    if (!transitions) continue

    let contextCount = 0
    for (const count of transitions.values()) {
      contextCount += count
    }
    if (contextCount > 0) {
      probability =
        ((transitions.get(targetPc) ?? 0) + BACKOFF_STRENGTH * probability) / (contextCount + BACKOFF_STRENGTH)
    }
  }

  return probability
}
