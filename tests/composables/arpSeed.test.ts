import { describe, expect, it } from 'vitest'
import { nextArpSeed, parseArpSeedInput } from '../../src/composables/arpSeed'

describe('nextArpSeed', () => {
  it('uses the drawn uint32 seed and advances when it repeats the previous one', () => {
    expect(nextArpSeed(12, () => 34)).toBe(34)
    expect(nextArpSeed(12, () => 12)).toBe(13)
    expect(nextArpSeed(4_294_967_295, () => 4_294_967_295)).toBe(0)
  })

  it('accepts manually entered decimal seeds across the uint32 range', () => {
    expect(parseArpSeedInput(' 0 ')).toBe(0)
    expect(parseArpSeedInput('4294967295')).toBe(4_294_967_295)
    expect(parseArpSeedInput('')).toBeNull()
    expect(parseArpSeedInput('-1')).toBeNull()
    expect(parseArpSeedInput('1.5')).toBeNull()
    expect(parseArpSeedInput('4294967296')).toBeNull()
  })
})
