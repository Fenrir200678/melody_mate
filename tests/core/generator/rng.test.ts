import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRng, createId, randomSeed } from '../../../src/core/generator/rng'
import { pickRandomRhythmPresetId } from '../../../src/core/rhythm/presets'
import { pickRandomProgressionId } from '../../../src/core/theory/progressions'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('seeded RNG', () => {
  it('returns the same sequence for the same seed and a different sequence for another seed', () => {
    const first = Array.from({ length: 8 }, createRng(42))
    const repeated = Array.from({ length: 8 }, createRng(42))
    const other = Array.from({ length: 8 }, createRng(43))

    expect(first).toEqual(repeated)
    expect(first).not.toEqual(other)
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true)
  })

  it.each([0, 0xffffffff])('handles boundary seed %i deterministically', (seed) => {
    const first = createRng(seed)
    const repeated = createRng(seed)
    const values = Array.from({ length: 32 }, () => first())

    expect(values).toEqual(Array.from({ length: 32 }, () => repeated()))
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true)
  })

  it('produces a broadly balanced deterministic distribution', () => {
    const values = Array.from({ length: 10_000 }, createRng(2026))
    const bins = Array(10).fill(0) as number[]
    for (const value of values) bins[Math.floor(value * bins.length)] += 1

    expect(values.every((value) => value >= 0 && value < 1)).toBe(true)
    expect(bins.every((count) => count >= 800 && count <= 1200)).toBe(true)
  })

  it('returns uint32 seeds and compact IDs', () => {
    const seed = randomSeed()
    expect(Number.isInteger(seed)).toBe(true)
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThanOrEqual(0xffffffff)
    expect(createId()).toMatch(/^[0-9a-f]{12}$/)
  })

  it('uses Web Crypto for random seeds when available', () => {
    const getRandomValues = vi.fn((values: Uint32Array) => {
      values[0] = 0xffffffff
      return values
    })
    vi.stubGlobal('crypto', { getRandomValues })

    expect(randomSeed()).toBe(0xffffffff)
    expect(getRandomValues).toHaveBeenCalledOnce()
  })

  it('falls back to Math.random when Web Crypto is unavailable', () => {
    vi.stubGlobal('crypto', undefined)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    expect(randomSeed()).toBe(0x80000000)
  })

  it('uses the supplied RNG for progression and rhythm preset selection', () => {
    const candidates = [{ id: 'first' }, { id: 'second' }]
    expect(pickRandomProgressionId(candidates, () => 0.75)).toBe('second')
    expect(pickRandomRhythmPresetId(candidates, () => 0.75)).toBe('second')
  })
})
