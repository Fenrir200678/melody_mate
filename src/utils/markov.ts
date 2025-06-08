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
 * Gets the transition map for a given state from the Markov table.
 * @param table - The Markov transition table.
 * @param currentState - The current state.
 * @returns The transition map (nextState -> count), or null if the state has no transitions.
 */
export function getTransitions(table: MarkovTable, currentState: string): Map<string, number> | null {
  const transitions = table.get(currentState)
  if (!transitions || transitions.size === 0) {
    return null
  }
  return transitions
}
