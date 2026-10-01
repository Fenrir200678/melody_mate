/**
 * Pure math and geometry utilities for DAW knobs and continuous rotary controllers.
 * Decoupled from Vue reactivity and DOM APIs.
 */

export type KnobCurve = 'linear' | 'logarithmic'

export const KNOB_MIN_ANGLE = -135
export const KNOB_MAX_ANGLE = 135
export const KNOB_TOTAL_SWEEP = KNOB_MAX_ANGLE - KNOB_MIN_ANGLE // 270 degrees
export const DEFAULT_PIXEL_RANGE = 180 // Pixels of drag for 0 to 1 full range (decoupled from dial size)

/**
 * Clamps a number between a lower and upper bound.
 */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

/**
 * Determines the number of decimal places in a step size to avoid IEEE-754 precision drift.
 */
export function getStepPrecision(step: number): number {
  const stepStr = step.toString()
  const dotIndex = stepStr.indexOf('.')
  if (dotIndex === -1) return 0
  return stepStr.length - dotIndex - 1
}

/**
 * Quantizes a continuous value to the nearest step relative to a base min value.
 */
export function quantizeStep(value: number, step: number, min = 0): number {
  if (step <= 0) return value
  const precision = Math.max(getStepPrecision(step), getStepPrecision(value))
  const steps = Math.round((value - min) / step)
  const quantized = min + steps * step
  return Number(quantized.toFixed(Math.min(precision, 6)))
}

/**
 * Converts a domain value to a normalized 0.0 .. 1.0 progress factor.
 * For logarithmic scaling (e.g. audio frequencies), min and max must be positive.
 */
export function valueToNormalized(value: number, min: number, max: number, curve: KnobCurve = 'linear'): number {
  if (max <= min) return 0
  const clampedValue = clamp(value, min, max)

  if (curve === 'logarithmic' && min > 0 && max > 0) {
    return clamp(Math.log(clampedValue / min) / Math.log(max / min), 0, 1)
  }

  return clamp((clampedValue - min) / (max - min), 0, 1)
}

/**
 * Converts a normalized 0.0 .. 1.0 factor back to a domain value.
 */
export function normalizedToValue(norm: number, min: number, max: number, curve: KnobCurve = 'linear'): number {
  const clampedNorm = clamp(norm, 0, 1)
  if (max <= min) return min

  if (curve === 'logarithmic' && min > 0 && max > 0) {
    return min * Math.pow(max / min, clampedNorm)
  }

  return min + clampedNorm * (max - min)
}

/**
 * Converts a domain value to a rotational angle between -135° and +135°.
 */
export function valueToAngle(value: number, min: number, max: number, curve: KnobCurve = 'linear'): number {
  const norm = valueToNormalized(value, min, max, curve)
  return KNOB_MIN_ANGLE + norm * KNOB_TOTAL_SWEEP
}

/**
 * Converts a rotational angle (-135° to +135°) to a domain value.
 */
export function angleToValue(angle: number, min: number, max: number, curve: KnobCurve = 'linear'): number {
  const clampedAngle = clamp(angle, KNOB_MIN_ANGLE, KNOB_MAX_ANGLE)
  const norm = (clampedAngle - KNOB_MIN_ANGLE) / KNOB_TOTAL_SWEEP
  return normalizedToValue(norm, min, max, curve)
}

export interface DragDeltaParams {
  startValue: number
  deltaY: number // Positive means dragged upward (increase)
  min: number
  max: number
  step?: number
  curve?: KnobCurve
  isFine?: boolean
  pixelRange?: number
}

/**
 * Computes a new value based on a vertical pointer drag delta.
 * Upward drag increases the value, downward decreases it.
 * Shift-drag applies a fine-tuning dampener (0.2x).
 */
export function calculateDragValue(params: DragDeltaParams): number {
  const {
    startValue,
    deltaY,
    min,
    max,
    step,
    curve = 'linear',
    isFine = false,
    pixelRange = DEFAULT_PIXEL_RANGE
  } = params

  if (max <= min) return min

  const fineMultiplier = isFine ? 0.2 : 1.0
  const normalizedDelta = (deltaY * fineMultiplier) / pixelRange

  const startNorm = valueToNormalized(startValue, min, max, curve)
  const targetNorm = clamp(startNorm + normalizedDelta, 0, 1)

  let calculatedValue = normalizedToValue(targetNorm, min, max, curve)

  if (step !== undefined && step > 0) {
    calculatedValue = quantizeStep(calculatedValue, step, min)
  } else {
    calculatedValue = Number(calculatedValue.toFixed(8))
  }

  return clamp(calculatedValue, min, max)
}

/**
 * Converts polar coordinates (with 0° at 12 o'clock) to SVG Cartesian coordinates.
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  // 0 degrees is 12 o'clock (straight up).
  // Positive angles rotate clockwise.
  const radians = (angleInDegrees * Math.PI) / 180
  const x = cx + radius * Math.sin(radians)
  const y = cy - radius * Math.cos(radians)

  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3))
  }
}

/**
 * Returns an SVG path string representing a circular arc from startAngle to endAngle.
 */
export function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  if (Math.abs(endAngle - startAngle) < 0.1) {
    return ''
  }

  const start = polarToCartesian(cx, cy, radius, startAngle)
  const end = polarToCartesian(cx, cy, radius, endAngle)
  const angleDiff = endAngle - startAngle
  const largeArcFlag = angleDiff > 180 ? 1 : 0

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
}

/**
 * Formats a numeric knob value with precision and optional units for display.
 */
export function formatKnobValue(value: number, precision?: number, unit?: string): string {
  let formatted: string
  if (precision !== undefined) {
    formatted = value.toFixed(precision)
  } else if (Number.isInteger(value)) {
    formatted = value.toString()
  } else {
    // Dynamically show up to 2 decimals without trailing zeroes
    formatted = parseFloat(value.toFixed(2)).toString()
  }

  return unit ? `${formatted} ${unit}` : formatted
}
