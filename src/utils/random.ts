export function choose<T>(items: T[]): T {
  if (items.length === 0) {
    throw new Error('Cannot choose from an empty array.')
  }
  const index = Math.floor(Math.random() * items.length)
  return items[index]
}

export function chooseWeighted<T>(items: T[], weights: number[]): T {
  if (items.length !== weights.length) {
    throw new Error('Items and weights must be of the same length.')
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  let random = Math.random() * totalWeight

  for (let i = 0; i < items.length; i++) {
    if (random < weights[i]) {
      return items[i]
    }
    random -= weights[i]
  }

  // Fallback, should not be reached if weights are correct
  return items[items.length - 1]
}
