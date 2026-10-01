export type ArpeggioPattern =
  | 'up'
  | 'down'
  | 'up-down'
  | 'down-up'
  | 'pedal-bass'
  | 'pinky-top'
  | 'converge'
  | 'diverge'
  | 'random'
  | 'brown'
  | 'chord-rhythm'

/**
 * Resolves the next pool position for an arpeggio pattern.
 *
 * `direction` is the pattern's internal carry-over state: a travel sign (-1/1) for up-down, down-up,
 * and brown, but a cycle counter for pedal-bass, pinky-top, converge, and diverge. `down` never flips it.
 * Callers must NOT reuse it as a melodic direction; derive that from the produced pitches instead.
 */
export function patternIndex(
  pattern: ArpeggioPattern,
  pool: number[],
  previous: number | null,
  direction: number,
  rng: () => number
): { preferred: number; alternatives: number[]; direction: number } {
  const last = pool.length - 1
  if (pool.length === 0) {
    return { preferred: 0, alternatives: [], direction }
  }

  if (pattern === 'chord-rhythm') {
    return { preferred: 0, alternatives: pool.map((_, index) => index), direction }
  }

  if (pattern === 'pedal-bass') {
    // Why: Pedal-bass alternates every moving chord tone with the root/lowest tone (0 -> 1 -> 0 -> 2 -> ...).
    // Rooted in classical basso ostinato and essential for driving Synthwave and Progressive House basslines,
    // this pattern anchors harmonic momentum while melodically ascending through the chord tones.
    if (pool.length <= 1) {
      return { preferred: 0, alternatives: [0], direction: 0 }
    }
    const cycleLength = 2 * (pool.length - 1)
    const k = previous === null ? 0 : ((direction % cycleLength) + cycleLength) % cycleLength
    const preferred = k % 2 === 0 ? 0 : Math.floor(k / 2) + 1
    const nextDirection = (k + 1) % cycleLength
    return { preferred, alternatives: [preferred], direction: nextDirection }
  }

  if (pattern === 'pinky-top') {
    // Why: Pinky-top anchors the highest lead note (the "pinky" on the keyboard) and alternates it with
    // ascending lower chord tones (last -> 0 -> last -> 1 -> last -> 2 -> ...), mimicking classical fingerstyle
    // guitar and synth-pop lead comping.
    if (pool.length <= 1) {
      return { preferred: 0, alternatives: [0], direction: 0 }
    }
    const cycleLength = 2 * (pool.length - 1)
    const k = previous === null ? 0 : ((direction % cycleLength) + cycleLength) % cycleLength
    const preferred = k % 2 === 0 ? last : Math.floor(k / 2)
    const nextDirection = (k + 1) % cycleLength
    return { preferred, alternatives: [preferred], direction: nextDirection }
  }

  if (pattern === 'converge') {
    // Why: Converge steps alternately inward from the outer extremes of the pitch register toward the center
    // (0 -> last -> 1 -> last - 1 -> ...), creating a centripetal melodic contour that builds harmonic tension
    // before resolving as the boundaries meet and reset.
    if (pool.length <= 1) {
      return { preferred: 0, alternatives: [0], direction: 0 }
    }
    const cycleLength = pool.length
    const k = previous === null ? 0 : ((direction % cycleLength) + cycleLength) % cycleLength
    const preferred = k % 2 === 0 ? Math.floor(k / 2) : last - Math.floor(k / 2)
    const nextDirection = (k + 1) % cycleLength
    return { preferred, alternatives: [preferred], direction: nextDirection }
  }

  if (pattern === 'diverge') {
    // Why: Diverge starts at the harmonic center tone and fans alternately outward toward the register boundaries
    // (mid -> mid + 1 -> mid - 1 -> mid + 2 -> ...), creating an expanding "blooming" contour that builds
    // dramatic register breadth before resetting.
    if (pool.length <= 1) {
      return { preferred: 0, alternatives: [0], direction: 0 }
    }
    const cycleLength = pool.length
    const k = previous === null ? 0 : ((direction % cycleLength) + cycleLength) % cycleLength
    const mid = Math.floor(last / 2)
    const offset = Math.ceil(k / 2)
    const raw = k % 2 === 0 ? mid - offset : mid + offset
    const preferred = Math.max(0, Math.min(last, raw))
    const nextDirection = (k + 1) % cycleLength
    return { preferred, alternatives: [preferred], direction: nextDirection }
  }

  if (previous === null) {
    const preferred =
      pattern === 'down' || pattern === 'down-up'
        ? last
        : pattern === 'random' || pattern === 'brown'
          ? Math.floor(rng() * pool.length)
          : 0
    const initialDirection = pattern === 'down-up' ? -1 : direction
    const alternatives =
      pattern === 'random' || pattern === 'brown'
        ? pool.map((_, index) => index)
        : [preferred, preferred + (pattern === 'down' || pattern === 'down-up' ? -1 : 1)]
    return {
      preferred,
      alternatives: alternatives.filter((index) => index >= 0 && index <= last),
      direction: initialDirection
    }
  }
  if (pattern === 'up') {
    const preferred = (previous + 1) % pool.length
    return { preferred, alternatives: [preferred, preferred + 1].filter((index) => index <= last), direction }
  }
  if (pattern === 'down') {
    const preferred = (previous - 1 + pool.length) % pool.length
    return { preferred, alternatives: [preferred, preferred - 1].filter((index) => index >= 0), direction }
  }
  if (pattern === 'up-down') {
    const nextDirection = previous === last ? -1 : previous === 0 ? 1 : direction
    const preferred = Math.max(0, Math.min(last, previous + nextDirection))
    const alternative = preferred + nextDirection
    return {
      preferred,
      alternatives: [preferred, alternative].filter((index) => index >= 0 && index <= last),
      direction: nextDirection
    }
  }
  if (pattern === 'down-up') {
    const nextDirection = previous === 0 ? 1 : previous === last ? -1 : direction
    const preferred = Math.max(0, Math.min(last, previous + nextDirection))
    const alternative = preferred + nextDirection
    return {
      preferred,
      alternatives: [preferred, alternative].filter((index) => index >= 0 && index <= last),
      direction: nextDirection
    }
  }
  if (pattern === 'random') {
    const preferred = Math.floor(rng() * pool.length)
    const alternatives = pool.map((_, index) => index).filter((index) => index !== preferred)
    return { preferred, alternatives: [preferred, ...alternatives], direction }
  }

  // Why: Brownian walk simulates organic melodic drift by prioritizing stepwise motion (stride 1 or 2)
  // with directional inertia, avoiding abrupt multi-octave leaps while remaining non-deterministic.
  const nextDirection = previous === last ? -1 : previous === 0 ? 1 : rng() < 0.18 ? -direction : direction
  const stride = rng() < 0.78 ? 1 : 2
  const preferred = Math.max(0, Math.min(last, previous + nextDirection * stride))
  const alternatives = [preferred, previous + nextDirection, previous + nextDirection * 2].filter(
    (index) => index >= 0 && index <= last && index !== previous
  )
  return { preferred, alternatives: [...new Set(alternatives)], direction: nextDirection }
}
