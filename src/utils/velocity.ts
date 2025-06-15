type VelocityOptions = {
  useFixed: boolean
  fixedValue?: number
}

const MAX_VELOCITY = 127
const DEFAULT_RANDOM_MIN = 0.4
const DEFAULT_RANDOM_RANGE = 0.3

/**
 * Calculates the note velocity based on the provided options.
 * Returns a value between 0 and 1.
 * @param options - Configuration for velocity calculation.
 * @returns The calculated velocity.
 */
export function calculateVelocity(options: VelocityOptions): number {
  if (options.useFixed && typeof options.fixedValue === 'number') {
    return Math.max(0, Math.min(1, options.fixedValue / MAX_VELOCITY))
  }
  return Number((DEFAULT_RANDOM_MIN + Math.random() * DEFAULT_RANDOM_RANGE).toFixed(2))
}
