import { describe, expect, it } from 'vitest'
import {
  humanizeNoteDuration,
  humanizeTimingOffset,
  humanizeVelocity,
  MAX_TIMING_JITTER_MS,
  MAX_VELOCITY_JITTER
} from '@/core/rhythm/humanize'

describe('Humanize Engine', () => {
  describe('humanizeNoteDuration', () => {
    it('preserves the uniform gate and minimum length with variation disabled', () => {
      const noRandomness = () => {
        throw new Error('Uniform gates must not use randomness')
      }
      expect(humanizeNoteDuration(3, 0.5, 0, 3, noRandomness)).toBe(1.5)
      expect(humanizeNoteDuration(1, 0.25, 0, 1, noRandomness)).toBe(0.25)
    })

    it('varies both sides of the base gate proportionally to the amount', () => {
      expect(humanizeNoteDuration(4, 0.5, 0.5, 4, () => 0)).toBe(1)
      expect(humanizeNoteDuration(4, 0.5, 0.5, 4, () => 1)).toBe(3)
      expect(humanizeNoteDuration(4, 0.5, 0.5, 4, () => 0.5)).toBe(2)
    })

    it('bounds varied gates to the minimum, original rhythm, and available space', () => {
      expect(humanizeNoteDuration(1, 0.25, 1, 1, () => 0)).toBe(0.25)
      expect(humanizeNoteDuration(4, 1, 1, 8, () => 1)).toBe(4)
      expect(humanizeNoteDuration(4, 1, 1, 2, () => 1)).toBe(2)
    })
  })

  describe('humanizeVelocity', () => {
    it('should return the exact base velocity when amount is 0', () => {
      expect(humanizeVelocity(100, 0)).toBe(100)
      expect(humanizeVelocity(64, 0)).toBe(64)
    })

    it('should strictly clamp velocity within [1, 127] when pushed to upper boundary', () => {
      const maxRng = () => 1.0 // Produces maximum positive delta
      expect(humanizeVelocity(127, 1.0, maxRng)).toBe(127)
      expect(humanizeVelocity(125, 1.0, maxRng)).toBe(127)
    })

    it('should strictly clamp velocity within [1, 127] when pushed to lower boundary', () => {
      const minRng = () => 0.0 // Produces maximum negative delta
      expect(humanizeVelocity(1, 1.0, minRng)).toBe(1)
      expect(humanizeVelocity(5, 1.0, minRng)).toBe(1)
    })

    it('should compute predictable deterministic jitter with custom RNG', () => {
      // At amount=1.0, max delta is MAX_VELOCITY_JITTER (15)
      // rng = 1.0 -> factor = +1.0 -> +15
      expect(humanizeVelocity(80, 1.0, () => 1.0)).toBe(80 + MAX_VELOCITY_JITTER)
      // rng = 0.0 -> factor = -1.0 -> -15
      expect(humanizeVelocity(80, 1.0, () => 0.0)).toBe(80 - MAX_VELOCITY_JITTER)
      // rng = 0.5 -> factor = 0.0 -> 0
      expect(humanizeVelocity(80, 1.0, () => 0.5)).toBe(80)
    })

    it('should return an integer value', () => {
      for (let i = 0; i < 20; i++) {
        const vel = humanizeVelocity(90, 0.7)
        expect(Number.isInteger(vel)).toBe(true)
        expect(vel).toBeGreaterThanOrEqual(1)
        expect(vel).toBeLessThanOrEqual(127)
      }
    })
  })

  describe('humanizeTimingOffset', () => {
    it('should return 0 timing offset when amount is 0', () => {
      expect(humanizeTimingOffset(0)).toBe(0)
    })

    it('should compute predictable timing offset in ms with custom RNG', () => {
      // rng = 1.0 -> +MAX_TIMING_JITTER_MS (15ms)
      expect(humanizeTimingOffset(1.0, () => 1.0)).toBe(MAX_TIMING_JITTER_MS)
      // rng = 0.0 -> -MAX_TIMING_JITTER_MS (-15ms)
      expect(humanizeTimingOffset(1.0, () => 0.0)).toBe(-MAX_TIMING_JITTER_MS)
      // rng = 0.5 -> 0ms
      expect(humanizeTimingOffset(1.0, () => 0.5)).toBe(0)
    })

    it('should scale jitter proportionally with amount', () => {
      const halfAmountJitter = humanizeTimingOffset(0.5, () => 1.0)
      expect(halfAmountJitter).toBeCloseTo(MAX_TIMING_JITTER_MS / 2, 2)
    })
  })
})
