import { chooseWeighted } from './random'

// Type for the Markov chain transition table
export type MarkovTable = Map<string, Map<string, number>>

/**
 * Builds a Markov chain transition table from a set of sequences.
 * @param sequences - An array of string arrays, where each inner array is a sequence.
 * @returns The Markov transition table.
 */
export function buildMarkovTable(sequences: string[][]): MarkovTable {
  const table: MarkovTable = new Map()

  for (const sequence of sequences) {
    if (sequence.length < 2) continue

    for (let i = 0; i < sequence.length - 1; i++) {
      const currentState = sequence[i]
      const nextState = sequence[i + 1]

      if (!table.has(currentState)) {
        table.set(currentState, new Map())
      }

      const transitions = table.get(currentState)!
      const currentCount = transitions.get(nextState) || 0
      transitions.set(nextState, currentCount + 1)
    }
  }

  return table
}

/**
 * Gets the next state from the Markov table based on the current state.
 * @param table - The Markov transition table.
 * @param currentState - The current state.
 * @returns The next state, or null if the current state has no transitions.
 */
export function getNextState(table: MarkovTable, currentState: string): string | null {
  const transitions = table.get(currentState)
  if (!transitions || transitions.size === 0) {
    return null
  }

  const items = Array.from(transitions.keys())
  const weights = Array.from(transitions.values())

  return chooseWeighted(items, weights)
}
