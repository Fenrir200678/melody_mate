import { describe, expect, it } from 'vitest'
import { applySwing, MAX_SWING_OFFSET_RATIO } from '@/core/rhythm/swing'

describe('Swing Timing Engine', () => {
  describe('applySwing', () => {
    it('should return 0 offset for all on-beat (even) steps regardless of swing amount', () => {
      const evenSteps = [0, 2, 4, 6, 8, 10, 12, 14]
      for (const step of evenSteps) {
        expect(applySwing(step, '16n', 0)).toBe(0)
        expect(applySwing(step, '16n', 0.5)).toBe(0)
        expect(applySwing(step, '16n', 1.0)).toBe(0)
      }
    })

    it('should return 0 offset for offbeat (odd) steps when swing is 0 (straight time)', () => {
      const oddSteps = [1, 3, 5, 7, 9, 11, 13, 15]
      for (const step of oddSteps) {
        expect(applySwing(step, '16n', 0)).toBe(0)
      }
    })

    it('should return maximum offset ratio (~1/3 step) at 100% swing for offbeats', () => {
      const oddSteps = [1, 3, 5, 7]
      for (const step of oddSteps) {
        const offset = applySwing(step, '16n', 1.0)
        expect(offset).toBeCloseTo(MAX_SWING_OFFSET_RATIO, 5)
        expect(offset).toBeCloseTo(1 / 3, 5)
      }
    })

    it('should scale linearly with swingAmount', () => {
      const offset50 = applySwing(1, '16n', 0.5)
      const offset100 = applySwing(1, '16n', 1.0)
      expect(offset50).toBeCloseTo(offset100 / 2, 5)
    })

    it('should support both 8n and 16n subdivisions', () => {
      expect(applySwing(1, '8n', 0.8)).toBeCloseTo(0.8 * MAX_SWING_OFFSET_RATIO, 5)
      expect(applySwing(1, '16n', 0.8)).toBeCloseTo(0.8 * MAX_SWING_OFFSET_RATIO, 5)
    })

    it('should clamp negative swing values to 0', () => {
      expect(applySwing(1, '16n', -0.5)).toBe(0)
    })

    it('should clamp swing values exceeding 1.0 to 1.0', () => {
      expect(applySwing(1, '16n', 1.5)).toBeCloseTo(MAX_SWING_OFFSET_RATIO, 5)
    })
  })
})
