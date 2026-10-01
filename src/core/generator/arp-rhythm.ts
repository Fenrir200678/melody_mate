import { createRng } from './rng'

/**
 * Calculates note velocity based on metric position in the bar and accent intensity.
 * The control continuously scales metric dynamic spread around a baseline (92):
 * 0% yields uniform machine-like velocity (92) for robotic synth lines;
 * 100% produces maximum metric articulation with authoritative downbeats (118) and subtle ghost notes (71).
 */
export function calculateArpVelocity(stepInBar: number, accentAmount: number): number {
  const normAccent = Math.max(0, Math.min(100, accentAmount)) / 100
  const BASE_VELOCITY = 92

  // Metric weighting heuristic:
  // Beat 1: Strong downbeat (+1.0)
  // Beat 3: Medium downbeat (+0.5)
  // Beats 2 & 4: Backbeat (+0.2)
  // 8th-note offbeats: Neutral (0.0)
  // 16th-note offbeats: Ghost notes (-0.8)
  let metricWeight = -0.8
  if (stepInBar === 0) metricWeight = 1.0
  else if (stepInBar === 8) metricWeight = 0.5
  else if (stepInBar === 4 || stepInBar === 12) metricWeight = 0.2
  else if (stepInBar % 2 === 0) metricWeight = 0.0

  // At accentAmount === 0, spread is 0 (flat velocity 92).
  // At accentAmount === 100, maxSpread is 26 (Beat 1 = 118, Ghost Note = 71).
  const maxSpread = 26 * normAccent
  const rawVelocity = Math.round(BASE_VELOCITY + metricWeight * maxSpread)
  return Math.max(40, Math.min(127, rawVelocity))
}

function shuffleSteps(steps: readonly number[], rng: () => number): number[] {
  const result = [...steps]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }
  return result
}

/**
 * Priority tiers for metric rest masking (from lowest to highest retention priority):
 * - Tier 4 (Lowest priority, dropped first): 16th-note offbeats (steps 1, 3, 5, 7, 9, 11, 13, 15)
 * - Tier 3: 8th-note offbeats (steps 2, 6, 10, 14)
 * - Tier 2: Beats 2 & 4 (steps 4, 12)
 * - Tier 1: Beat 3 (step 8)
 * - Tier 0 (Highest priority, NEVER dropped): Beat 1 (step 0)
 *
 * Why: Metric rest masking introduces rhythmic syncopation, groove, and breathing space on weak
 * metric positions without undermining harmonic pulse. Downbeats anchor the metric grid and
 * Beat 1 is permanently anchored so chord transitions remain musically authoritative.
 *
 * `barSteps` are the bar-local positions the caller actually plays. Masking follows this visited
 * phase instead of the global rate grid, so work ranges that start mid-grid keep sounding; at
 * least one visited step per non-empty bar always survives.
 */
export function maskArpBarSteps(barSteps: readonly number[], density: number, seed: number, bar: number): Set<number> {
  const totalBarSteps = barSteps.length
  if (totalBarSteps === 0) {
    return new Set()
  }

  const normDensity = Math.max(50, Math.min(100, density))
  const activeStepsCount = Math.max(1, Math.min(totalBarSteps, Math.round(totalBarSteps * (normDensity / 100))))

  if (activeStepsCount >= totalBarSteps) {
    return new Set(barSteps)
  }

  const dropCount = totalBarSteps - activeStepsCount
  const tier4 = barSteps.filter((s) => s % 2 !== 0) // 16th offbeats: 1, 3, 5, 7, 9, 11, 13, 15
  const tier3 = barSteps.filter((s) => s % 4 === 2) // 8th offbeats: 2, 6, 10, 14
  const tier2 = barSteps.filter((s) => s === 4 || s === 12) // Beats 2 & 4
  const tier1 = barSteps.filter((s) => s === 8) // Beat 3
  // Beat 1 (step 0) is Tier 0 and NEVER dropped.

  const barSeed = (seed ^ Math.imul(bar + 1, 0x9e3779b9)) >>> 0
  const rng = createRng(barSeed)

  const dropped = new Set<number>()
  let remainingToDrop = dropCount

  for (const tier of [tier4, tier3, tier2, tier1]) {
    if (remainingToDrop <= 0) break
    if (tier.length === 0) continue

    if (tier.length <= remainingToDrop) {
      for (const step of tier) {
        dropped.add(step)
      }
      remainingToDrop -= tier.length
    } else {
      const shuffled = shuffleSteps(tier, rng)
      for (let i = 0; i < remainingToDrop; i++) {
        dropped.add(shuffled[i])
      }
      remainingToDrop = 0
    }
  }

  return new Set(barSteps.filter((step) => !dropped.has(step)))
}
