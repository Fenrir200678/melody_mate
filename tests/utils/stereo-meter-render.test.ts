import { describe, expect, it } from 'vitest'
import {
  calculateStereoMeterGeometry,
  dbToMeterRatio,
  dbToMeterY,
  grToMeterRatio,
  METER_MAX_DB,
  METER_MIN_DB
} from '../../src/utils/canvas/stereo-meter-render'

describe('stereo-meter-render pure calculations', () => {
  describe('dbToMeterRatio', () => {
    it('returns 0 for values at or below minDb', () => {
      expect(dbToMeterRatio(METER_MIN_DB)).toBe(0)
      expect(dbToMeterRatio(METER_MIN_DB - 10)).toBe(0)
      expect(dbToMeterRatio(-Infinity)).toBe(0)
      expect(dbToMeterRatio(NaN)).toBe(0)
    })

    it('returns 1 for values at or above maxDb', () => {
      expect(dbToMeterRatio(METER_MAX_DB)).toBe(1)
      expect(dbToMeterRatio(METER_MAX_DB + 5)).toBe(1)
    })

    it('correctly maps intermediate values', () => {
      const mid = (METER_MIN_DB + METER_MAX_DB) / 2
      expect(dbToMeterRatio(mid)).toBeCloseTo(0.5, 3)
    })
  })

  describe('dbToMeterY', () => {
    it('maps maxDb to topY and minDb to bottomY', () => {
      const topY = 10
      const bottomY = 100
      expect(dbToMeterY(METER_MAX_DB, topY, bottomY)).toBe(topY)
      expect(dbToMeterY(METER_MIN_DB, topY, bottomY)).toBe(bottomY)
    })
  })

  describe('grToMeterRatio', () => {
    it('returns 0 for zero or insignificant gain reduction', () => {
      expect(grToMeterRatio(0)).toBe(0)
      expect(grToMeterRatio(0.04)).toBe(0)
      expect(grToMeterRatio(-1)).toBe(0)
      expect(grToMeterRatio(-Infinity)).toBe(0)
    })

    it('clamps to 1 at max gain reduction threshold', () => {
      expect(grToMeterRatio(12)).toBe(1)
      expect(grToMeterRatio(20)).toBe(1)
    })

    it('maps intermediate gain reductions proportionally', () => {
      expect(grToMeterRatio(6)).toBeCloseTo(0.5, 2)
    })
  })

  describe('calculateStereoMeterGeometry', () => {
    it('returns null for dimensions that are too small', () => {
      expect(calculateStereoMeterGeometry(30, 80)).toBeNull()
      expect(calculateStereoMeterGeometry(100, 20)).toBeNull()
      expect(calculateStereoMeterGeometry(0, 0)).toBeNull()
    })

    it('produces valid coordinates for standard dock dimensions', () => {
      const geom = calculateStereoMeterGeometry(200, 110, -1)
      expect(geom).not.toBeNull()
      if (!geom) return

      expect(geom.leftBarX).toBeLessThan(geom.rightBarX)
      expect(geom.rightBarX).toBeLessThan(geom.scaleX)
      expect(geom.scaleX).toBeLessThan(geom.grBarX)

      expect(geom.meterTopY).toBeLessThan(geom.meterBottomY)
      expect(geom.meterHeight).toBeGreaterThan(0)

      expect(geom.ceilingY).toBeGreaterThan(geom.meterTopY)
      expect(geom.ceilingY).toBeLessThan(geom.meterBottomY)

      expect(geom.ticks.length).toBeGreaterThan(0)
      expect(geom.grTicks.length).toBeGreaterThan(0)
    })
  })
})
