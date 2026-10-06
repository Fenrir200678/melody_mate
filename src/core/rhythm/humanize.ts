/**
 * Maximum velocity jitter delta in MIDI velocity units (1–127) at 100% humanize.
 */
export const MAX_VELOCITY_JITTER = 25

/**
 * Maximum timing jitter in milliseconds at 100% humanize.
 */
export const MAX_TIMING_JITTER_MS = 15

export function humanizeNoteDuration(
  durationSteps: number,
  noteLength: number,
  amount: number,
  maxDurationSteps: number,
  rng: () => number = Math.random
): number {
  const baseDuration = durationSteps * noteLength
  const clampedAmount = Math.max(0, Math.min(1, amount))
  if (clampedAmount === 0) {
    return Math.max(0.25, Math.round(baseDuration * 1000) / 1000)
  }

  const variedDuration = baseDuration * (1 + (rng() * 2 - 1) * clampedAmount)
  // Preserve the rhythm's articulation ceiling and leave the next onset clear.
  const maximum = Math.min(durationSteps, maxDurationSteps)
  return Math.min(maximum, Math.max(0.25, Math.round(variedDuration * 1000) / 1000))
}

/**
 * Adds humanized organic velocity variation to a MIDI note velocity.
 * Clamps the resulting value strictly within the valid MIDI velocity range (1–127).
 *
 * @param baseVelocity - Base velocity (1–127)
 * @param amount - Humanize intensity from 0.0 (mechanical) to 1.0 (expressive)
 * @param rng - Optional random number generator for deterministic testing (defaults to Math.random)
 * @returns Clamped integer velocity between 1 and 127
 */
export function humanizeVelocity(baseVelocity: number, amount: number, rng: () => number = Math.random): number {
  const clampedAmount = Math.max(0, Math.min(1, amount))
  if (clampedAmount === 0) {
    return Math.max(1, Math.min(127, Math.round(baseVelocity)))
  }

  // Generate bipolar delta in [-1, +1]
  const randomFactor = rng() * 2 - 1
  const delta = Math.round(randomFactor * clampedAmount * MAX_VELOCITY_JITTER)

  return Math.max(1, Math.min(127, Math.round(baseVelocity + delta)))
}

/**
 * Generates an organic micro-timing timing offset in milliseconds.
 *
 * @param amount - Humanize intensity from 0.0 (locked) to 1.0 (loose)
 * @param rng - Optional random number generator for deterministic testing (defaults to Math.random)
 * @returns Timing offset in milliseconds (positive or negative)
 */
export function humanizeTimingOffset(amount: number, rng: () => number = Math.random): number {
  const clampedAmount = Math.max(0, Math.min(1, amount))
  if (clampedAmount === 0) {
    return 0
  }

  // Generate bipolar delta in [-1, +1]
  const randomFactor = rng() * 2 - 1
  const jitterMs = randomFactor * clampedAmount * MAX_TIMING_JITTER_MS

  // Round to 2 decimal places to avoid IEEE-754 precision artifacts
  return Math.round(jitterMs * 100) / 100
}
