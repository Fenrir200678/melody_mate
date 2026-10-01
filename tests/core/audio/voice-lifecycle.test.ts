import { describe, expect, it } from 'vitest'
import {
  clampFadeSeconds,
  crossfadeGainPair,
  DEFAULT_CROSSFADE_SECONDS,
  DEFAULT_TAIL_LIFETIME_SECONDS,
  extractReleaseSeconds,
  MAX_FADE_SECONDS,
  MIN_FADE_SECONDS,
  PANIC_SILENCE_POLICY,
  planVoiceGraphTimeline,
  TRUNCATE_SILENCE_POLICY
} from '../../../src/core/audio/voice-lifecycle'

describe('voice lifecycle policy', () => {
  it('reads a numeric envelope release time', () => {
    expect(extractReleaseSeconds({ envelope: { release: 0.8 } })).toBe(0.8)
    expect(extractReleaseSeconds({ envelope: { release: '8n' } })).toBe(0)
    expect(extractReleaseSeconds({ envelope: {} })).toBe(0)
    expect(extractReleaseSeconds({})).toBe(0)
    expect(extractReleaseSeconds(null)).toBe(0)
  })

  it('ignores non-finite or negative release values', () => {
    expect(extractReleaseSeconds({ envelope: { release: Number.NaN } })).toBe(0)
    expect(extractReleaseSeconds({ envelope: { release: Number.POSITIVE_INFINITY } })).toBe(0)
    expect(extractReleaseSeconds({ envelope: { release: -1 } })).toBe(0)
  })

  it('bounds the retired graph lifetime by the patch release time', () => {
    const short = planVoiceGraphTimeline(0.2)
    const long = planVoiceGraphTimeline(30)

    expect(short.tailSeconds).toBe(0.2)
    expect(long.tailSeconds).toBe(DEFAULT_TAIL_LIFETIME_SECONDS)
    expect(short.disposeAfterSeconds).toBeLessThan(long.disposeAfterSeconds)
    expect(short.releaseAfterSeconds).toBeLessThan(short.disposeAfterSeconds)
  })

  it('falls back to a bounded default tail when no release time is known', () => {
    const timeline = planVoiceGraphTimeline(0)

    expect(timeline.tailSeconds).toBe(DEFAULT_TAIL_LIFETIME_SECONDS)
    expect(timeline.crossfadeSeconds).toBe(DEFAULT_CROSSFADE_SECONDS)
    expect(timeline.disposeAfterSeconds).toBeGreaterThan(timeline.releaseAfterSeconds)
  })

  it('clamps fade lengths into a musically safe range', () => {
    expect(clampFadeSeconds(0)).toBe(MIN_FADE_SECONDS)
    expect(clampFadeSeconds(-5)).toBe(MIN_FADE_SECONDS)
    expect(clampFadeSeconds(100)).toBe(MAX_FADE_SECONDS)
    expect(clampFadeSeconds(Number.NaN)).toBe(DEFAULT_CROSSFADE_SECONDS)
  })

  it('keeps the crossfade pair level-neutral', () => {
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      const pair = crossfadeGainPair(progress)
      expect(pair.incoming + pair.outgoing).toBeCloseTo(1, 10)
    }
    expect(crossfadeGainPair(-1)).toEqual({ incoming: 0, outgoing: 1 })
    expect(crossfadeGainPair(2)).toEqual({ incoming: 1, outgoing: 0 })
  })

  it('exposes a bounded panic fade that is longer than the truncation fade', () => {
    expect(PANIC_SILENCE_POLICY.fadeInSeconds).toBeGreaterThan(TRUNCATE_SILENCE_POLICY.fadeInSeconds)
    expect(PANIC_SILENCE_POLICY.fadeOutSeconds).toBeGreaterThan(TRUNCATE_SILENCE_POLICY.fadeOutSeconds)
    expect(PANIC_SILENCE_POLICY.fadeInSeconds).toBeLessThan(0.05)
  })
})
