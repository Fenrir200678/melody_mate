import { describe, expect, it } from 'vitest'
import { generateEuclideanPattern } from '@/core/rhythm/euclidean'

describe('Euclidean Rhythm Engine', () => {
  describe('generateEuclideanPattern', () => {
    it('should generate classic Tresillo rhythm (3 pulses in 8 steps)', () => {
      const pattern = generateEuclideanPattern(3, 8)
      expect(pattern).toEqual([true, false, false, true, false, false, true, false])
    })

    it('should generate classic Cinquillo rhythm (5 pulses in 8 steps)', () => {
      const pattern = generateEuclideanPattern(5, 8)
      expect(pattern).toEqual([true, false, true, true, false, true, true, false])
    })

    it('should generate standard Bossa Nova rhythm (5 pulses in 16 steps)', () => {
      const pattern = generateEuclideanPattern(5, 16)
      expect(pattern).toEqual([
        true,
        false,
        false,
        true,
        false,
        false,
        true,
        false,
        false,
        true,
        false,
        false,
        true,
        false,
        false,
        false
      ])
    })

    it('should correctly handle forward rotation without length loss', () => {
      const rotated = generateEuclideanPattern(3, 8, 1)
      expect(rotated).toEqual([false, true, false, false, true, false, false, true])
      expect(rotated).toHaveLength(8)
    })

    it('should handle full cyclic rotation wrap-around', () => {
      const base = generateEuclideanPattern(3, 8, 0)
      const rotated8 = generateEuclideanPattern(3, 8, 8)
      expect(rotated8).toEqual(base)
    })

    it('should correctly handle negative rotation', () => {
      // Rotation -1 shifts left: index 1 moves to index 0
      const rotatedLeft = generateEuclideanPattern(3, 8, -1)
      expect(rotatedLeft).toEqual([false, false, true, false, false, true, false, true])
    })

    describe('Edge Cases', () => {
      it('should return empty array when steps <= 0', () => {
        expect(generateEuclideanPattern(3, 0)).toEqual([])
        expect(generateEuclideanPattern(3, -5)).toEqual([])
      })

      it('should return all false when pulses <= 0', () => {
        expect(generateEuclideanPattern(0, 8)).toEqual([false, false, false, false, false, false, false, false])
        expect(generateEuclideanPattern(-2, 4)).toEqual([false, false, false, false])
      })

      it('should return all true when pulses >= steps', () => {
        expect(generateEuclideanPattern(8, 8)).toEqual([true, true, true, true, true, true, true, true])
        expect(generateEuclideanPattern(12, 8)).toEqual([true, true, true, true, true, true, true, true])
      })

      it('should handle single pulse evenly', () => {
        expect(generateEuclideanPattern(1, 4)).toEqual([true, false, false, false])
      })

      it('should handle symmetric even pulses', () => {
        expect(generateEuclideanPattern(2, 4)).toEqual([true, false, true, false])
      })
    })
  })
})
