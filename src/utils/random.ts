export function choose<T>(items: T[]): T {
  if (items.length === 0) {
    throw new Error('Cannot choose from an empty array.')
  }
  const index = Math.floor(Math.random() * items.length)
  return items[index]
}

export function chooseWeighted<T>(items: T[], weights: number[]): T {
  if (items.length === 0) {
    throw new Error('Cannot choose from an empty array.')
  }
  if (items.length !== weights.length) {
    throw new Error('Items and weights must be of the same length.')
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  if (totalWeight <= 0) {
    // If all weights are zero or negative, fall back to a non-weighted random choice.
    return choose(items)
  }
  let random = Math.random() * totalWeight

  for (let i = 0; i < items.length; i++) {
    if (random < weights[i]) {
      return items[i]
    }
    random -= weights[i]
  }

  // Fallback, in case of rounding errors or if the loop somehow fails.
  return items[items.length - 1]
}
