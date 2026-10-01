export const MIN_PRESET_TRIM_DB = -30
export const MAX_PRESET_TRIM_DB = 0
export const MAX_EFFECT_SEND_GAIN = 1.0

export function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum
  return Math.min(maximum, Math.max(minimum, value))
}

export function decibelsToGain(decibels: number): number {
  return 10 ** (decibels / 20)
}

export function gainToDecibels(gain: number): number {
  if (gain <= 0) return -Infinity
  return 20 * Math.log10(gain)
}

export function clampPresetTrimDb(decibels: number): number {
  return clamp(decibels, MIN_PRESET_TRIM_DB, MAX_PRESET_TRIM_DB)
}

export function presetTrimToGain(decibels: number): number {
  return decibelsToGain(clampPresetTrimDb(decibels))
}

export function clampEffectSendGain(gain: number): number {
  return clamp(gain, 0, MAX_EFFECT_SEND_GAIN)
}
