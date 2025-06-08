// Type for the Markov chain transition table
export type MarkovTable = Map<string, Map<string, number>>

/**
 * Builds a Markov chain transition table of a specified order from a set of sequences.
 * @param sequences - An array of string arrays, where each inner array is a sequence.
 * @param order - The order of the Markov chain (e.g., 2 for a 2-gram model). Defaults to 2.
 * @returns The Markov transition table.
 */
export function buildMarkovTable(sequences: string[][], order: number = 2): MarkovTable {
  const table: MarkovTable = new Map()
  const separator = ','

  for (const sequence of sequences) {
    if (sequence.length <= order) continue

    for (let i = 0; i < sequence.length - order; i++) {
      const currentState = sequence.slice(i, i + order).join(separator)
      const nextState = sequence[i + order]

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
 * @param currentState - The current state sequence of notes.
 * @returns The transition map (nextState -> count), or null if the state has no transitions.
 */
export function getTransitions(table: MarkovTable, currentState: string[]): Map<string, number> | null {
  const separator = ','
  const stateKey = currentState.join(separator)
  const transitions = table.get(stateKey)

  if (!transitions || transitions.size === 0) {
    return null
  }
  return transitions
}
