/**
 * Generates a Euclidean rhythm pattern using the Bjorklund algorithm.
 * Evenly distributes a specified number of pulses over a fixed number of steps.
 *
 * @param pulses - Number of active beats (onsets)
 * @param steps - Total length of the rhythmic sequence in steps
 * @param rotation - Steps to cyclically rotate the pattern to the right (default: 0)
 * @returns An array of boolean values where true = note onset and false = rest
 */
export function generateEuclideanPattern(pulses: number, steps: number, rotation: number = 0): boolean[] {
  if (steps <= 0) {
    return []
  }

  // Edge cases: No pulses or saturated pulses
  if (pulses <= 0) {
    return new Array(steps).fill(false)
  }
  if (pulses >= steps) {
    return new Array(steps).fill(true)
  }

  // Bjorklund algorithm initialization:
  // pulses groups of [true] and (steps - pulses) groups of [false]
  let front: boolean[][] = new Array(pulses).fill(null).map(() => [true])
  let back: boolean[][] = new Array(steps - pulses).fill(null).map(() => [false])

  // Repeatedly combine remaining back groups with front groups
  while (back.length > 1) {
    const minLen = Math.min(front.length, back.length)
    for (let i = 0; i < minLen; i++) {
      front[i] = front[i].concat(back[i])
    }

    if (back.length > front.length) {
      back = back.slice(minLen)
    } else {
      back = front.slice(minLen)
      front = front.slice(0, minLen)
    }
  }

  // Concatenate final sequences into a single unrotated pattern
  const rawPattern: boolean[] = []
  for (const group of front) {
    rawPattern.push(...group)
  }
  for (const group of back) {
    rawPattern.push(...group)
  }

  // Cyclic right rotation: a positive rotation shifts beats forward in time (e.g. index 0 -> index 1)
  const len = rawPattern.length
  const offset = ((rotation % len) + len) % len
  if (offset === 0) {
    return rawPattern
  }

  const rotated: boolean[] = new Array(len)
  for (let i = 0; i < len; i++) {
    rotated[i] = rawPattern[(i - offset + len) % len]
  }

  return rotated
}
