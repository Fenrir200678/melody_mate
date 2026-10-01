import { describe, expect, it } from 'vitest'
import { ALL_BUILTIN_PRESETS, SOFT_TRIANGLE_KEYS_PRESET } from '../../../src/core/presets/synths'
import { parseSynthPatch } from '../../../src/core/synth/patch'
import { parameterFromNormalized, parameterToNormalized } from '../../../src/core/synth/parameters'

const native = {
  ...SOFT_TRIANGLE_KEYS_PRESET,
  id: 'native-test',
  source: 'user',
  backend: 'native-subtractive',
  backendVersion: 1,
  voice: { mode: 'poly', maxVoices: 8, retrigger: true, legato: false, glideSeconds: 0, minMidi: 24, maxMidi: 108 },
  oscillators: {
    A: {
      waveform: 'sawtooth',
      detuneCents: 0,
      levelDb: -6,
      phase: 'free',
      unison: 1,
      unisonDetuneCents: 0,
      panSpread: 0
    },
    B: { waveform: 'sine', detuneCents: 0, levelDb: -12, phase: 'free', unison: 1, unisonDetuneCents: 0, panSpread: 0 }
  },
  sub: { waveform: 'sine', levelDb: -30, octave: -1 },
  noise: { type: 'white', levelDb: -60 },
  filter: { type: 'lowpass', slope: 12, cutoffHz: 8000, resonance: 1, keytracking: 0, drive: 0 },
  amp: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.3 },
  modEnvelopes: [
    { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 },
    { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 }
  ],
  lfos: [
    { waveform: 'sine', rate: 1, sync: false, retrigger: true },
    { waveform: 'sine', rate: 2, sync: false, retrigger: true }
  ],
  macros: [0, 0, 0, 0],
  modulation: [{ source: 'lfo1', target: 'filter.cutoffHz', depth: 0.25, polarity: 'bipolar', curve: 'linear' }],
  inserts: { drive: 0, chorus: 0 }
}
const { synthType: _type, options: _options, ...nativePatch } = native

describe('versioned synth patches', () => {
  it('accepts every calibrated factory patch and distinct IDs', () => {
    expect(new Set(ALL_BUILTIN_PRESETS.map((patch) => patch.id)).size).toBe(ALL_BUILTIN_PRESETS.length)
    for (const patch of ALL_BUILTIN_PRESETS) expect(parseSynthPatch(patch)).toEqual(patch)
    expect(Object.isFrozen(ALL_BUILTIN_PRESETS[0])).toBe(true)
  })

  it('uses the same parser for custom Tone and native patches', () => {
    expect(parseSynthPatch({ ...SOFT_TRIANGLE_KEYS_PRESET, id: 'user-tone', source: 'user' }).id).toBe('user-tone')
    expect(parseSynthPatch(nativePatch).backend).toBe('native-subtractive')
  })

  it('rejects unknown versions, untyped bags and non-finite values', () => {
    expect(() => parseSynthPatch({ ...SOFT_TRIANGLE_KEYS_PRESET, version: 2 })).toThrow()
    expect(() => parseSynthPatch({ ...SOFT_TRIANGLE_KEYS_PRESET, options: { arbitrary: true } })).toThrow()
    expect(() => parseSynthPatch({ ...nativePatch, outputTrimDb: Infinity })).toThrow()
  })

  it('enforces resource limits and modulation capabilities', () => {
    expect(() => parseSynthPatch({ ...nativePatch, voice: { ...nativePatch.voice, maxVoices: 17 } })).toThrow()
    expect(() =>
      parseSynthPatch({
        ...nativePatch,
        oscillators: { ...nativePatch.oscillators, A: { ...nativePatch.oscillators.A, unison: 5 } }
      })
    ).toThrow()
    expect(() =>
      parseSynthPatch({ ...nativePatch, modulation: [{ ...nativePatch.modulation[0], target: 'oscA.unison' }] })
    ).toThrow()
    expect(() =>
      parseSynthPatch({ ...nativePatch, lfos: [{ ...nativePatch.lfos[0], sync: true, rate: 9 }, nativePatch.lfos[1]] })
    ).toThrow()
    expect(() =>
      parseSynthPatch({
        ...nativePatch,
        modulation: [{ ...nativePatch.modulation[0], source: 'macro1', target: 'macro2' }]
      })
    ).toThrow()
  })

  it('maps logarithmic parameters consistently', () => {
    const midpoint = parameterFromNormalized('filter.cutoffHz', 0.5)
    expect(midpoint).toBeCloseTo(Math.sqrt(20 * 20000))
    expect(parameterToNormalized('filter.cutoffHz', midpoint)).toBeCloseTo(0.5)
    expect(parameterFromNormalized('amp.decay', 0)).toBe(0)
    expect(parameterFromNormalized('amp.sustain', 0.6)).toBeCloseTo(0.6)
    expect(parameterToNormalized('amp.sustain', 0.6)).toBeCloseTo(0.6)
  })

  it('provides defaults for macroNames and insert bypass while validating bounds', () => {
    const parsed = parseSynthPatch(nativePatch)
    expect(parsed.backend === 'native-subtractive' && parsed.macroNames).toEqual([
      'Macro 1',
      'Macro 2',
      'Macro 3',
      'Macro 4'
    ])
    expect(parsed.backend === 'native-subtractive' && parsed.inserts.driveBypass).toBe(false)
    expect(parsed.backend === 'native-subtractive' && parsed.inserts.chorusBypass).toBe(false)

    // Custom names and bypass
    const custom = parseSynthPatch({
      ...nativePatch,
      macroNames: ['Brightness', 'Vibrato', 'Drive', 'Space'],
      inserts: { drive: 0.5, driveBypass: true, chorus: 0.8, chorusBypass: false }
    })
    expect(custom.backend === 'native-subtractive' && custom.macroNames[0]).toBe('Brightness')
    expect(custom.backend === 'native-subtractive' && custom.inserts.driveBypass).toBe(true)

    // Invalid bounds
    expect(() =>
      parseSynthPatch({
        ...nativePatch,
        inserts: { drive: 1.5, chorus: 0 }
      })
    ).toThrow()
  })

  it('supports oscillator, sub, and noise enabled flags with default true', () => {
    const defaultParsed = parseSynthPatch(nativePatch)
    if (defaultParsed.backend === 'native-subtractive') {
      expect(defaultParsed.oscillators.A.enabled).toBe(true)
      expect(defaultParsed.oscillators.B.enabled).toBe(true)
      expect(defaultParsed.sub.enabled).toBe(true)
      expect(defaultParsed.noise.enabled).toBe(true)
    }

    const disabledOscs = parseSynthPatch({
      ...nativePatch,
      oscillators: {
        A: { ...nativePatch.oscillators.A, enabled: false },
        B: { ...nativePatch.oscillators.B, enabled: true }
      },
      sub: { ...nativePatch.sub, enabled: false },
      noise: { ...nativePatch.noise, enabled: false }
    })
    if (disabledOscs.backend === 'native-subtractive') {
      expect(disabledOscs.oscillators.A.enabled).toBe(false)
      expect(disabledOscs.oscillators.B.enabled).toBe(true)
      expect(disabledOscs.sub.enabled).toBe(false)
      expect(disabledOscs.noise.enabled).toBe(false)
    }
  })
})
