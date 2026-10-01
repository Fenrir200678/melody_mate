import { describe, expect, it } from 'vitest'
import {
  modulatedParameter,
  ModulationRoutesSchema,
  modulationSourceValue,
  type ModulationRoute
} from '../../../src/core/synth/modulation'

const route = (
  source: ModulationRoute['source'],
  target: ModulationRoute['target'],
  depth: number
): ModulationRoute => ({
  source,
  target,
  depth,
  polarity: 'bipolar',
  curve: 'linear'
})

describe('modulation mapping and route validation', () => {
  it('applies depth in the target descriptor domain and clamps the final value', () => {
    expect(
      modulatedParameter('filter.cutoffHz', 20, [{ route: route('lfo1', 'filter.cutoffHz', 0.5), value: 1 }])
    ).toBeCloseTo(Math.sqrt(20 * 20000))
    expect(
      modulatedParameter('filter.cutoffHz', 10000, [{ route: route('lfo1', 'filter.cutoffHz', 1), value: 1 }])
    ).toBe(20000)
    expect(
      modulatedParameter('oscA.detuneCents', 0, [{ route: route('velocity', 'oscA.detuneCents', -0.25), value: 1 }])
    ).toBe(-600)
  })

  it('shapes bipolar and unipolar source values', () => {
    expect(modulationSourceValue(-1, 'unipolar', 'linear')).toBe(0)
    expect(modulationSourceValue(0, 'unipolar', 'exponential')).toBe(0.25)
    expect(modulationSourceValue(-0.5, 'bipolar', 'exponential')).toBe(-0.25)
  })

  it('rejects duplicate, cyclic and discrete target routes', () => {
    expect(ModulationRoutesSchema.safeParse([route('lfo1', 'filter.cutoffHz', 0.5)]).success).toBe(true)
    expect(
      ModulationRoutesSchema.safeParse([route('lfo1', 'filter.cutoffHz', 0.5), route('lfo1', 'filter.cutoffHz', 0.2)])
        .success
    ).toBe(false)
    expect(
      ModulationRoutesSchema.safeParse([route('macro1', 'macro2' as ModulationRoute['target'], 0.5)]).success
    ).toBe(false)
    expect(
      ModulationRoutesSchema.safeParse([route('lfo1', 'oscA.unison' as ModulationRoute['target'], 0.5)]).success
    ).toBe(false)
  })

  it('enforces a maximum of 16 modulation routes', () => {
    const valid16: ModulationRoute[] = []
    const sources: ModulationRoute['source'][] = [
      'lfo1',
      'lfo2',
      'modEnv1',
      'modEnv2',
      'velocity',
      'keytrack',
      'macro1',
      'macro2'
    ]
    const targets: ModulationRoute['target'][] = ['filter.cutoffHz', 'filter.resonance']
    for (const s of sources) {
      for (const t of targets) {
        if (valid16.length < 16) valid16.push(route(s, t, 0.2))
      }
    }
    expect(valid16.length).toBe(16)
    expect(ModulationRoutesSchema.safeParse(valid16).success).toBe(true)

    // 17 routes must be rejected
    const invalid17 = [...valid16, route('macro3', 'filter.cutoffHz', 0.1)]
    expect(ModulationRoutesSchema.safeParse(invalid17).success).toBe(false)
  })
})
