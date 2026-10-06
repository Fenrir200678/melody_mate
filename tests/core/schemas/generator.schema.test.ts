import { describe, expect, it } from 'vitest'
import {
  ArpPatternEnum,
  ArpRateEnum,
  GeneratorParamsSchema,
  MotifPatternEnum,
  resolveGeneratorParams
} from '../../../src/core/schemas/generator.schema'
import { DEFAULT_GENERATOR_PARAMS } from '../../../src/config/defaults'

describe('generator.schema', () => {
  it('parses default generator parameters matching DEFAULT_GENERATOR_PARAMS', () => {
    const parsed = GeneratorParamsSchema.parse({})
    expect(parsed).toEqual(DEFAULT_GENERATOR_PARAMS)
  })

  it('accepts the expanded motif patterns AABC and ABCB', () => {
    expect(GeneratorParamsSchema.parse({ motif: 'AABC' }).motif).toBe('AABC')
    expect(GeneratorParamsSchema.parse({ motif: 'ABCB' }).motif).toBe('ABCB')
    expect(GeneratorParamsSchema.parse({}).motif).toBe(DEFAULT_GENERATOR_PARAMS.motif)
  })

  it('validates note length variation from zero to one', () => {
    expect(GeneratorParamsSchema.parse({ noteLengthVariation: 0 }).noteLengthVariation).toBe(0)
    expect(GeneratorParamsSchema.parse({ noteLengthVariation: 1 }).noteLengthVariation).toBe(1)
    expect(() => GeneratorParamsSchema.parse({ noteLengthVariation: -0.1 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ noteLengthVariation: 1.1 })).toThrow()
  })

  it('exports MotifPatternEnum with the full pattern list in stable order', () => {
    expect(MotifPatternEnum.options).toEqual(['FREE', 'ABAB', 'ABAC', 'AABA', 'AAAB', 'AABC', 'ABCB'])
  })

  it('exports ArpPatternEnum with all 11 patterns included in stable order', () => {
    expect(ArpPatternEnum.options).toEqual([
      'up',
      'down',
      'up-down',
      'down-up',
      'pedal-bass',
      'pinky-top',
      'converge',
      'diverge',
      'random',
      'brown',
      'chord-rhythm'
    ])
    expect(GeneratorParamsSchema.parse({ arpPattern: 'pedal-bass' }).arpPattern).toBe('pedal-bass')
    expect(GeneratorParamsSchema.parse({ arpPattern: 'pinky-top' }).arpPattern).toBe('pinky-top')
    expect(GeneratorParamsSchema.parse({ arpPattern: 'diverge' }).arpPattern).toBe('diverge')
    expect(GeneratorParamsSchema.parse({ arpPattern: 'brown' }).arpPattern).toBe('brown')
    expect(GeneratorParamsSchema.parse({ arpPattern: 'chord-rhythm' }).arpPattern).toBe('chord-rhythm')
  })

  it('exports ArpRateEnum with dotted rates 1/8d and 1/4d in stable order and parses them', () => {
    expect(ArpRateEnum.options).toEqual(['1/4', '1/8', '1/16', '1/8d', '1/4d'])
    expect(GeneratorParamsSchema.parse({ arpRate: '1/8d' }).arpRate).toBe('1/8d')
    expect(GeneratorParamsSchema.parse({ arpRate: '1/4d' }).arpRate).toBe('1/4d')
  })

  it('validates persisted arp controls and applies their configured defaults', () => {
    const defaults = GeneratorParamsSchema.parse({})
    expect(defaults.arpPattern).toBe(DEFAULT_GENERATOR_PARAMS.arpPattern)
    expect(defaults.arpRate).toBe(DEFAULT_GENERATOR_PARAMS.arpRate)
    expect(defaults.arpOctaveRange).toBe(DEFAULT_GENERATOR_PARAMS.arpOctaveRange)
    expect(defaults.arpPitchSource).toBe(DEFAULT_GENERATOR_PARAMS.arpPitchSource)
    expect(defaults.arpSeed).toBe(DEFAULT_GENERATOR_PARAMS.arpSeed)
    expect(defaults.arpSeedLocked).toBe(DEFAULT_GENERATOR_PARAMS.arpSeedLocked)
    expect(defaults.arpGate).toBe(DEFAULT_GENERATOR_PARAMS.arpGate)
    expect(defaults.arpAdherence).toBe(DEFAULT_GENERATOR_PARAMS.arpAdherence)
    expect(defaults.arpAccent).toBe(DEFAULT_GENERATOR_PARAMS.arpAccent)
    expect(defaults.arpDensity).toBe(DEFAULT_GENERATOR_PARAMS.arpDensity)

    const configured = GeneratorParamsSchema.parse({
      arpPattern: 'up-down',
      arpRate: '1/16',
      arpOctaveRange: 4,
      arpPitchSource: 'chord-voicing',
      arpSeed: 4_294_967_295,
      arpSeedLocked: true,
      arpGate: 50,
      arpAdherence: 75,
      arpAccent: 80,
      arpDensity: 70
    })
    expect(configured).toMatchObject({
      arpPattern: 'up-down',
      arpRate: '1/16',
      arpOctaveRange: 4,
      arpPitchSource: 'chord-voicing',
      arpSeed: 4_294_967_295,
      arpSeedLocked: true,
      arpGate: 50,
      arpAdherence: 75,
      arpAccent: 80,
      arpDensity: 70
    })
  })

  it('rejects arp controls outside their supported schema', () => {
    expect(() => GeneratorParamsSchema.parse({ arpPattern: 'bounce' })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpRate: '1/32' })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpOctaveRange: 0 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpOctaveRange: 1.5 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpPitchSource: 'voicing' })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpPitchSource: 'pitch-class' })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpPitchSource: 1 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpSeed: -1 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpSeed: 4_294_967_296 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpSeedLocked: 12 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpGate: 19 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpGate: 101 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpGate: 50.5 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpAdherence: -1 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpAdherence: 101 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpAdherence: 50.5 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpAccent: -1 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpAccent: 101 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpAccent: 50.5 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpDensity: 49 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpDensity: 101 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ arpDensity: 75.5 })).toThrow()
  })

  it('validates contour strength from zero to one', () => {
    expect(GeneratorParamsSchema.parse({ contourStrength: 0 }).contourStrength).toBe(0)
    expect(GeneratorParamsSchema.parse({ contourStrength: 1 }).contourStrength).toBe(1)
    expect(() => GeneratorParamsSchema.parse({ contourStrength: -0.1 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ contourStrength: 1.1 })).toThrow()
  })

  it('validates call and response answer controls', () => {
    expect(GeneratorParamsSchema.parse({ answerStyle: 'continue' }).answerStyle).toBe('continue')
    expect(GeneratorParamsSchema.parse({ answerStyle: 'contrast' }).answerStyle).toBe('contrast')
    expect(() => GeneratorParamsSchema.parse({ answerStyle: 'repeat' as never })).toThrow()
    expect(GeneratorParamsSchema.parse({ answerVariation: 0 }).answerVariation).toBe(0)
    expect(GeneratorParamsSchema.parse({ answerVariation: 1 }).answerVariation).toBe(1)
    expect(() => GeneratorParamsSchema.parse({ answerVariation: -0.1 })).toThrow()
    expect(() => GeneratorParamsSchema.parse({ answerVariation: 1.1 })).toThrow()
  })

  it('validates startWithRoot and endWithRoot booleans', () => {
    const withRoot = GeneratorParamsSchema.parse({
      startWithRoot: true,
      endWithRoot: true
    })

    expect(withRoot.startWithRoot).toBe(true)
    expect(withRoot.endWithRoot).toBe(true)
  })

  describe('resolveGeneratorParams', () => {
    it('resolves and preserves cadence properties through resolveGeneratorParams', () => {
      const base = GeneratorParamsSchema.parse({})
      const patched = resolveGeneratorParams(base, {
        startWithRoot: true,
        endWithRoot: true
      })

      expect(patched.startWithRoot).toBe(true)
      expect(patched.endWithRoot).toBe(true)
      expect(patched.motif).toBe(DEFAULT_GENERATOR_PARAMS.motif)
    })

    it('harmonizes maxOctave when minOctave exceeds it', () => {
      const current = GeneratorParamsSchema.parse({ minOctave: 3, maxOctave: 4 })
      const resolved = resolveGeneratorParams(current, { minOctave: 6 })
      expect(resolved.minOctave).toBe(6)
      expect(resolved.maxOctave).toBe(6)
    })

    it('harmonizes minOctave when maxOctave is lower than it', () => {
      const current = GeneratorParamsSchema.parse({ minOctave: 4, maxOctave: 5 })
      const resolved = resolveGeneratorParams(current, { maxOctave: 2 })
      expect(resolved.minOctave).toBe(2)
      expect(resolved.maxOctave).toBe(2)
    })

    it('merges valid partial params without modifying other fields', () => {
      const current = GeneratorParamsSchema.parse({ motif: 'ABAB' })
      const resolved = resolveGeneratorParams(current, { motif: 'AABA', restProbability: 0.25 })
      expect(resolved.motif).toBe('AABA')
      expect(resolved.restProbability).toBe(0.25)
      expect(resolved.minOctave).toBe(current.minOctave)
      expect(resolved.maxOctave).toBe(current.maxOctave)
    })
  })
})
