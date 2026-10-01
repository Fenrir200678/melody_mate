export interface ParameterDescriptor {
  readonly id: string
  readonly unit: 'Hz' | 's' | 'dB' | 'cents' | 'semitones' | 'ratio' | '%'
  readonly min: number
  readonly max: number
  readonly default: number
  readonly scale: 'linear' | 'logarithmic'
  readonly smoothingSeconds: number
  readonly modulation: 'none' | 'voice' | 'global'
  readonly update: 'continuous' | 'topology'
}

export const PARAMETER_DESCRIPTORS = {
  'oscA.levelDb': {
    unit: 'dB',
    min: -60,
    max: 0,
    default: -6,
    scale: 'linear',
    smoothingSeconds: 0.01,
    modulation: 'voice',
    update: 'continuous'
  },
  'oscB.levelDb': {
    unit: 'dB',
    min: -60,
    max: 0,
    default: -12,
    scale: 'linear',
    smoothingSeconds: 0.01,
    modulation: 'voice',
    update: 'continuous'
  },
  'oscA.detuneCents': {
    unit: 'cents',
    min: -1200,
    max: 1200,
    default: 0,
    scale: 'linear',
    smoothingSeconds: 0.02,
    modulation: 'voice',
    update: 'continuous'
  },
  'oscB.detuneCents': {
    unit: 'cents',
    min: -1200,
    max: 1200,
    default: 0,
    scale: 'linear',
    smoothingSeconds: 0.02,
    modulation: 'voice',
    update: 'continuous'
  },
  'filter.cutoffHz': {
    unit: 'Hz',
    min: 20,
    max: 20000,
    default: 8000,
    scale: 'logarithmic',
    smoothingSeconds: 0.02,
    modulation: 'voice',
    update: 'continuous'
  },
  'filter.resonance': {
    unit: 'ratio',
    min: 0,
    max: 12,
    default: 1,
    scale: 'linear',
    smoothingSeconds: 0.02,
    modulation: 'voice',
    update: 'continuous'
  },
  'amp.attack': {
    unit: 's',
    min: 0.001,
    max: 10,
    default: 0.01,
    scale: 'logarithmic',
    smoothingSeconds: 0,
    modulation: 'none',
    update: 'continuous'
  },
  'amp.decay': {
    unit: 's',
    min: 0,
    max: 10,
    default: 0.2,
    scale: 'linear',
    smoothingSeconds: 0,
    modulation: 'none',
    update: 'continuous'
  },
  'amp.sustain': {
    unit: 'ratio',
    min: 0,
    max: 1,
    default: 0.6,
    scale: 'linear',
    smoothingSeconds: 0,
    modulation: 'none',
    update: 'continuous'
  },
  'amp.release': {
    unit: 's',
    min: 0.001,
    max: 20,
    default: 0.4,
    scale: 'logarithmic',
    smoothingSeconds: 0,
    modulation: 'none',
    update: 'continuous'
  },
  outputTrimDb: {
    unit: 'dB',
    min: -60,
    max: 6,
    default: -12,
    scale: 'linear',
    smoothingSeconds: 0.02,
    modulation: 'global',
    update: 'continuous'
  },
  'oscA.unison': {
    unit: '%',
    min: 1,
    max: 4,
    default: 1,
    scale: 'linear',
    smoothingSeconds: 0,
    modulation: 'none',
    update: 'topology'
  },
  'oscB.unison': {
    unit: '%',
    min: 1,
    max: 4,
    default: 1,
    scale: 'linear',
    smoothingSeconds: 0,
    modulation: 'none',
    update: 'topology'
  },
  'oscA.unisonDetuneCents': {
    unit: 'cents',
    min: 0,
    max: 100,
    default: 15,
    scale: 'linear',
    smoothingSeconds: 0.02,
    modulation: 'none',
    update: 'continuous'
  },
  'oscB.unisonDetuneCents': {
    unit: 'cents',
    min: 0,
    max: 100,
    default: 15,
    scale: 'linear',
    smoothingSeconds: 0.02,
    modulation: 'none',
    update: 'continuous'
  },
  'inserts.drive': {
    unit: '%',
    min: 0,
    max: 1,
    default: 0,
    scale: 'linear',
    smoothingSeconds: 0.02,
    modulation: 'none',
    update: 'continuous'
  },
  'inserts.chorus': {
    unit: '%',
    min: 0,
    max: 1,
    default: 0,
    scale: 'linear',
    smoothingSeconds: 0.02,
    modulation: 'none',
    update: 'continuous'
  },
  'inserts.reverb': {
    unit: '%',
    min: 0,
    max: 1,
    default: 0,
    scale: 'linear',
    smoothingSeconds: 0.02,
    modulation: 'none',
    update: 'continuous'
  }
} as const satisfies Record<string, Omit<ParameterDescriptor, 'id'>>

export type ParameterId = keyof typeof PARAMETER_DESCRIPTORS

export function parameterFromNormalized(id: ParameterId, normalized: number): number {
  const descriptor = PARAMETER_DESCRIPTORS[id]
  const t = Math.max(0, Math.min(1, normalized))
  return descriptor.scale === 'logarithmic'
    ? descriptor.min * (descriptor.max / descriptor.min) ** t
    : descriptor.min + (descriptor.max - descriptor.min) * t
}

export function parameterToNormalized(id: ParameterId, value: number): number {
  const descriptor = PARAMETER_DESCRIPTORS[id]
  const clamped = Math.max(descriptor.min, Math.min(descriptor.max, value))
  return descriptor.scale === 'logarithmic'
    ? Math.log(clamped / descriptor.min) / Math.log(descriptor.max / descriptor.min)
    : (clamped - descriptor.min) / (descriptor.max - descriptor.min)
}

export const BACKEND_PARAMETER_CAPABILITIES = {
  tone: ['outputTrimDb'],
  'native-subtractive': Object.keys(PARAMETER_DESCRIPTORS)
} as const

export function supportsParameter(backend: keyof typeof BACKEND_PARAMETER_CAPABILITIES, id: string): boolean {
  return (BACKEND_PARAMETER_CAPABILITIES[backend] as readonly string[]).includes(id)
}
