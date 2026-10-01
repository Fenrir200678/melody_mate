import { describe, expect, it } from 'vitest'
import {
  clampEffectSendGain,
  clampPresetTrimDb,
  decibelsToGain,
  gainToDecibels,
  MAX_EFFECT_SEND_GAIN,
  presetTrimToGain
} from '@/core/audio/gain-staging'

describe('gain staging mappings', () => {
  it('round-trips finite decibel and gain values', () => {
    expect(decibelsToGain(-6)).toBeCloseTo(0.501187, 5)
    expect(gainToDecibels(decibelsToGain(-18))).toBeCloseTo(-18, 10)
    expect(gainToDecibels(0)).toBe(-Infinity)
  })

  it('bounds preset trim and converts the bounded value', () => {
    expect(clampPresetTrimDb(-100)).toBe(-30)
    expect(clampPresetTrimDb(2)).toBe(0)
    expect(presetTrimToGain(-100)).toBeCloseTo(decibelsToGain(-30), 10)
  })

  it('bounds effect sends to the documented supported range', () => {
    expect(clampEffectSendGain(-0.1)).toBe(0)
    expect(clampEffectSendGain(1)).toBe(MAX_EFFECT_SEND_GAIN)
    expect(clampEffectSendGain(Number.NaN)).toBe(0)
  })
})
