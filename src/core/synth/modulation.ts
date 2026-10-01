import { z } from 'zod'
import { PARAMETER_DESCRIPTORS, parameterFromNormalized, parameterToNormalized, type ParameterId } from './parameters'

export const MODULATION_SOURCES = [
  'modEnv1',
  'modEnv2',
  'lfo1',
  'lfo2',
  'velocity',
  'keytrack',
  'macro1',
  'macro2',
  'macro3',
  'macro4'
] as const
export const MODULATION_TARGETS = Object.keys(PARAMETER_DESCRIPTORS).filter(
  (id) => PARAMETER_DESCRIPTORS[id as keyof typeof PARAMETER_DESCRIPTORS].modulation === 'voice'
) as [string, ...string[]]

export type ModulationRoute = z.infer<typeof ModulationRouteSchema>

export function modulationSourceValue(
  value: number,
  polarity: ModulationRoute['polarity'],
  curve: ModulationRoute['curve']
): number {
  const bounded = Math.max(-1, Math.min(1, value))
  const shaped = polarity === 'unipolar' ? (bounded + 1) / 2 : bounded
  return curve === 'exponential' ? Math.sign(shaped) * shaped * shaped : shaped
}

export function modulatedParameter(
  id: ParameterId,
  base: number,
  routes: readonly { route: ModulationRoute; value: number }[]
): number {
  let normalized = parameterToNormalized(id, base)
  for (const { route, value } of routes) {
    if (route.target === id) normalized += route.depth * modulationSourceValue(value, route.polarity, route.curve)
  }
  return parameterFromNormalized(id, normalized)
}

export const ModulationRouteSchema = z.strictObject({
  source: z.enum(MODULATION_SOURCES),
  target: z.enum(MODULATION_TARGETS),
  depth: z.number().finite().min(-1).max(1),
  polarity: z.enum(['unipolar', 'bipolar']),
  curve: z.enum(['linear', 'exponential'])
})

export const ModulationRoutesSchema = z
  .array(ModulationRouteSchema)
  .max(16)
  .superRefine((routes, ctx) => {
    const seen = new Set<string>()
    for (const [index, route] of routes.entries()) {
      const key = `${route.source}:${route.target}`
      if (seen.has(key)) ctx.addIssue({ code: 'custom', message: 'Duplicate modulation route', path: [index] })
      seen.add(key)
      if (route.target.startsWith('macro') || route.target.startsWith('lfo') || route.target.startsWith('modEnv')) {
        ctx.addIssue({ code: 'custom', message: 'Modulator feedback is unsupported', path: [index] })
      }
    }
  })
