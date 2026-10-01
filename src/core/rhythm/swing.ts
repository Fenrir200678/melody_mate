/**
 * Maximum timing delay factor for offbeat steps under 100% swing.
 * In a standard triplet shuffle feel (66.7% / 33.3%), the offbeat is delayed
 * by exactly one third (1/3) of the step duration towards the next downbeat.
 */
export const MAX_SWING_OFFSET_RATIO = 1 / 3

/**
 * Calculates the timing offset factor for a given sequencer step.
 * On-beat (even) steps remain locked to the grid, while offbeat (odd) steps
 * receive a forward time shift proportional to swingAmount.
 *
 * @param step - 0-based sequencer step index
 * @param subdivision - Time grid subdivision ('8n' or '16n')
 * @param swingAmount - Swing depth from 0.0 (straight) to 1.0 (full triplet shuffle)
 * @returns Timing offset in fractions of a step (e.g. 0.0 to ~0.333)
 */
export function applySwing(step: number, _subdivision: '8n' | '16n', swingAmount: number): number {
  const clampedAmount = Math.max(0, Math.min(1, swingAmount))

  // Downbeats (even steps) and zero swing never shift
  if (step % 2 === 0 || clampedAmount === 0) {
    return 0
  }

  // Offbeats (odd steps) shift forward towards the subsequent downbeat
  return clampedAmount * MAX_SWING_OFFSET_RATIO
}
