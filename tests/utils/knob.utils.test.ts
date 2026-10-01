import { describe, expect, it } from 'vitest'
import {
  angleToValue,
  calculateDragValue,
  clamp,
  describeArc,
  formatKnobValue,
  KNOB_MAX_ANGLE,
  KNOB_MIN_ANGLE,
  normalizedToValue,
  polarToCartesian,
  quantizeStep,
  valueToAngle,
  valueToNormalized
} from '@/utils/knob.utils'

describe('knob.utils', () => {
  describe('clamp & quantizeStep', () => {
    it('clamps values within bounds', () => {
      expect(clamp(5, 0, 10)).toBe(5)
      expect(clamp(-5, 0, 10)).toBe(0)
      expect(clamp(15, 0, 10)).toBe(10)
      expect(clamp(NaN, 0, 10)).toBe(0)
    })

    it('quantizes values according to step size', () => {
      expect(quantizeStep(4.2, 1, 0)).toBe(4)
      expect(quantizeStep(4.6, 1, 0)).toBe(5)
      expect(quantizeStep(0.24, 0.1, 0)).toBe(0.2)
      expect(quantizeStep(0.26, 0.1, 0)).toBe(0.3)
      expect(quantizeStep(250, 50, 100)).toBe(250)
    })
  })

  describe('linear value normalization and conversion', () => {
    it('maps min to 0, max to 1, and midpoint to 0.5', () => {
      expect(valueToNormalized(0, 0, 100)).toBe(0)
      expect(valueToNormalized(100, 0, 100)).toBe(1)
      expect(valueToNormalized(50, 0, 100)).toBe(0.5)

      expect(normalizedToValue(0, 0, 100)).toBe(0)
      expect(normalizedToValue(1, 0, 100)).toBe(100)
      expect(normalizedToValue(0.5, 0, 100)).toBe(50)
    })

    it('handles negative ranges correctly', () => {
      expect(valueToNormalized(0, -20, 20)).toBe(0.5)
      expect(normalizedToValue(0.5, -20, 20)).toBe(0)
    })
  })

  describe('logarithmic value normalization (audio frequencies)', () => {
    const minFreq = 200
    const maxFreq = 18000

    it('normalizes logarithmic values correctly', () => {
      expect(valueToNormalized(minFreq, minFreq, maxFreq, 'logarithmic')).toBeCloseTo(0, 5)
      expect(valueToNormalized(maxFreq, minFreq, maxFreq, 'logarithmic')).toBeCloseTo(1, 5)

      // Geometric mean (middle in log scale): sqrt(200 * 18000) = sqrt(3600000) = ~1897.366
      const geoMean = Math.sqrt(minFreq * maxFreq)
      expect(valueToNormalized(geoMean, minFreq, maxFreq, 'logarithmic')).toBeCloseTo(0.5, 3)
    })

    it('converts normalized factor back to logarithmic value', () => {
      const geoMean = Math.sqrt(minFreq * maxFreq)
      expect(normalizedToValue(0, minFreq, maxFreq, 'logarithmic')).toBeCloseTo(minFreq, 1)
      expect(normalizedToValue(1, minFreq, maxFreq, 'logarithmic')).toBeCloseTo(maxFreq, 1)
      expect(normalizedToValue(0.5, minFreq, maxFreq, 'logarithmic')).toBeCloseTo(geoMean, 1)
    })

    it('falls back to linear if min is non-positive', () => {
      expect(valueToNormalized(5, 0, 10, 'logarithmic')).toBe(0.5)
      expect(normalizedToValue(0.5, 0, 10, 'logarithmic')).toBe(5)
    })
  })

  describe('rotational sweep angles (-135° to +135°)', () => {
    it('maps boundaries to exact angles', () => {
      expect(valueToAngle(0, 0, 100)).toBe(KNOB_MIN_ANGLE) // -135
      expect(valueToAngle(100, 0, 100)).toBe(KNOB_MAX_ANGLE) // 135
      expect(valueToAngle(50, 0, 100)).toBe(0) // 12 o'clock center
    })

    it('converts angles back to domain values', () => {
      expect(angleToValue(-135, 0, 100)).toBe(0)
      expect(angleToValue(135, 0, 100)).toBe(100)
      expect(angleToValue(0, 0, 100)).toBe(50)
    })
  })

  describe('calculateDragValue (vertical pointer drag)', () => {
    it('increases value when dragged upward and decreases when dragged downward', () => {
      // DeltaY positive is dragging up
      const increased = calculateDragValue({
        startValue: 50,
        deltaY: 80, // half of 160 range = +0.5 of range = +50
        min: 0,
        max: 100,
        pixelRange: 160
      })
      expect(increased).toBe(100)

      const decreased = calculateDragValue({
        startValue: 50,
        deltaY: -40, // -0.25 of range = -25
        min: 0,
        max: 100,
        pixelRange: 160
      })
      expect(decreased).toBe(25)
    })

    it('applies 0.2x fine tuning multiplier when isFine is true (Shift key)', () => {
      const normalDelta = calculateDragValue({
        startValue: 50,
        deltaY: 40,
        min: 0,
        max: 100,
        pixelRange: 160,
        isFine: false
      })
      // +0.25 * 100 = 75
      expect(normalDelta).toBe(75)

      const fineDelta = calculateDragValue({
        startValue: 50,
        deltaY: 40,
        min: 0,
        max: 100,
        pixelRange: 160,
        isFine: true
      })
      // +0.25 * 0.2 = +0.05 * 100 = 55
      expect(fineDelta).toBe(55)
    })

    it('clamps drag result between min and max', () => {
      const overMax = calculateDragValue({
        startValue: 90,
        deltaY: 200,
        min: 0,
        max: 100
      })
      expect(overMax).toBe(100)

      const underMin = calculateDragValue({
        startValue: 10,
        deltaY: -200,
        min: 0,
        max: 100
      })
      expect(underMin).toBe(0)
    })

    it('quantizes to step', () => {
      const stepped = calculateDragValue({
        startValue: 0,
        deltaY: 35,
        min: 0,
        max: 100,
        step: 10,
        pixelRange: 160
      })
      // 35 / 160 * 100 = 21.875 -> nearest 10 is 20
      expect(stepped).toBe(20)
    })
  })

  describe('SVG geometry (polarToCartesian & describeArc)', () => {
    it("calculates 12 o'clock as top (x = cx, y = cy - r)", () => {
      const top = polarToCartesian(50, 50, 20, 0)
      expect(top.x).toBe(50)
      expect(top.y).toBe(30)
    })

    it("calculates 3 o'clock as right (x = cx + r, y = cy)", () => {
      const right = polarToCartesian(50, 50, 20, 90)
      expect(right.x).toBe(70)
      expect(right.y).toBe(50)
    })

    it('describes an SVG arc correctly', () => {
      const arc = describeArc(50, 50, 20, -135, 135)
      expect(arc).toContain('M')
      expect(arc).toContain('A 20 20 0 1 1')
    })
  })

  describe('formatKnobValue', () => {
    it('formats values with precision and units', () => {
      expect(formatKnobValue(1000, 0, 'Hz')).toBe('1000 Hz')
      expect(formatKnobValue(1.2345, 2)).toBe('1.23')
      expect(formatKnobValue(50, undefined, '%')).toBe('50 %')
      expect(formatKnobValue(1.5)).toBe('1.5')
    })
  })

  describe('default value reset & clamping edge cases', () => {
    it('resets to defaultValue within bounds', () => {
      const defaultValue = 3200
      const min = 200
      const max = 18000
      const resetValue = clamp(defaultValue, min, max)
      expect(resetValue).toBe(3200)
    })

    it('falls back to min when defaultValue is undefined', () => {
      const defaultValue = undefined
      const min = 0
      const max = 100
      const resetValue = clamp(defaultValue !== undefined ? defaultValue : min, min, max)
      expect(resetValue).toBe(0)
    })

    it('clamps out-of-range default values', () => {
      expect(clamp(25000, 200, 18000)).toBe(18000)
      expect(clamp(-50, 0, 100)).toBe(0)
    })

    it('handles logarithmic drag updates across frequency range', () => {
      const min = 200
      const max = 18000
      const startValue = 200 // at min
      const dragged = calculateDragValue({
        startValue,
        deltaY: 80, // half range
        min,
        max,
        curve: 'logarithmic',
        pixelRange: 160
      })
      // Halfway in log scale from 200 to 18000 should be ~1897 Hz
      expect(dragged).toBeCloseTo(Math.sqrt(min * max), 0)
    })
  })
})
