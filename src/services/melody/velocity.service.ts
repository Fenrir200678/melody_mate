import type { Dynamic } from '@/ts/types/dynamics.types'

/**
 * Service for calculating note velocities.
 */

/**
 * Options for velocity calculation.
 */
type VelocityOptions = {
  useFixedVelocity: boolean
  fixedVelocity?: number
  dynamics?: Dynamic[]
}

const MAX_VELOCITY = 127

/**
 * Calculates the note velocity based on the provided options.
 * Returns a value between 0 and 1.
 * @param options - Configuration for velocity calculation.
 * @returns The calculated velocity.
 */
export function calculateVelocity(options: VelocityOptions): number {
  if (options.useFixedVelocity && typeof options.fixedVelocity === 'number') {
    return _getFixedVelocity(options.fixedVelocity)
  }

  if (options.dynamics) {
    return _getDynamicVelocity(options.dynamics)
  }

  // fallback
  return 0.5
}

/**
 * Returns a fixed velocity.
 * @param fixedValue - The fixed velocity value.
 * @returns The fixed velocity.
 */
function _getFixedVelocity(fixedValue: number): number {
  return Math.max(0, Math.min(1, fixedValue / MAX_VELOCITY))
}

/**
 * Returns a dynamic velocity.
 * @param dynamics - The dynamics to use.
 * @returns The dynamic velocity.
 */
function _getDynamicVelocity(dynamics: Dynamic[]): number {
  const dynamic = dynamics[Math.floor(Math.random() * dynamics.length)]
  const velocity = Math.random() * (dynamic.range[1] - dynamic.range[0]) + dynamic.range[0]
  return Math.max(0, Math.min(1, velocity / MAX_VELOCITY))
}
