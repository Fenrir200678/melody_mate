import { z } from 'zod'
import { ModulationRoutesSchema } from './modulation'

const finite = z.number().finite()
const envelope = z.strictObject({
  attack: finite.min(0.001).max(10),
  decay: finite.min(0).max(10),
  sustain: finite.min(0).max(1),
  release: finite.min(0.001).max(20)
})
const oscillator = z.strictObject({
  type: z.enum(['sine', 'triangle', 'sawtooth', 'square', 'pulse', 'fattriangle', 'fatsawtooth']),
  count: finite.int().min(1).max(4).optional(),
  spread: finite.min(0).max(100).optional(),
  width: finite.min(0).max(1).optional()
})
const toneBase = { oscillator, envelope }
const toneModulation = { modulation: oscillator, modulationEnvelope: envelope, harmonicity: finite.min(0.01).max(32) }
const filter = z.strictObject({
  Q: finite.min(0).max(12),
  type: z.literal('lowpass'),
  rolloff: z.union([z.literal(-12), z.literal(-24)])
})
const filterEnvelope = envelope.extend({ baseFrequency: finite.min(20).max(20000), octaves: finite.min(0).max(8) })
const metadata = {
  version: z.literal(1),
  id: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  category: z.enum(['lead', 'chord', 'preview', 'custom']),
  tags: z.array(z.string().min(1).max(40)).max(12),
  author: z.string().min(1).max(100),
  source: z.enum(['factory', 'user']),
  outputTrimDb: finite.min(-60).max(6),
  defaultMacros: z
    .strictObject({
      cutoff: finite.min(20).max(20000).optional(),
      resonance: finite.min(0).max(12).optional(),
      delaySend: finite.min(0).max(1).optional(),
      reverbSend: finite.min(0).max(1).optional(),
      chorusSend: finite.min(0).max(1).optional()
    })
    .optional()
}
const tone = { ...metadata, backend: z.literal('tone'), backendVersion: z.literal(1) }
const nativeOscillator = z.strictObject({
  enabled: z.boolean().default(true),
  waveform: z.enum(['sine', 'triangle', 'sawtooth', 'square']),
  detuneCents: finite.min(-1200).max(1200),
  levelDb: finite.min(-60).max(0),
  phase: z.enum(['free', 'reset']),
  unison: finite.int().min(1).max(4),
  unisonDetuneCents: finite.min(0).max(100),
  panSpread: finite.min(0).max(1)
})
const lfo = z
  .strictObject({
    waveform: z.enum(['sine', 'triangle', 'sawtooth', 'square']),
    rate: finite.min(0.01).max(40),
    sync: z.boolean(),
    retrigger: z.boolean()
  })
  .refine((value) => !value.sync || value.rate <= 8, 'Synced LFO rate must be at most eight cycles per beat')
const native = {
  ...metadata,
  backend: z.literal('native-subtractive'),
  backendVersion: z.literal(1),
  voice: z
    .strictObject({
      mode: z.enum(['mono', 'poly']),
      maxVoices: finite.int().min(1).max(16),
      retrigger: z.boolean(),
      legato: z.boolean(),
      glideSeconds: finite.min(0).max(2),
      minMidi: finite.int().min(0).max(127),
      maxMidi: finite.int().min(0).max(127)
    })
    .refine((v) => v.minMidi <= v.maxMidi),
  oscillators: z.strictObject({ A: nativeOscillator, B: nativeOscillator }),
  sub: z.strictObject({
    enabled: z.boolean().default(true),
    waveform: z.enum(['sine', 'triangle']),
    levelDb: finite.min(-60).max(0),
    octave: z.literal(-1)
  }),
  noise: z.strictObject({
    enabled: z.boolean().default(true),
    type: z.enum(['white', 'pink']),
    levelDb: finite.min(-60).max(0)
  }),
  filter: z.strictObject({
    type: z.enum(['lowpass', 'highpass']),
    slope: z.union([z.literal(12), z.literal(24)]),
    cutoffHz: finite.min(20).max(20000),
    resonance: finite.min(0).max(12),
    keytracking: finite.min(0).max(1),
    drive: finite.min(0).max(1)
  }),
  amp: envelope,
  modEnvelopes: z.tuple([envelope, envelope]),
  lfos: z.tuple([lfo, lfo]),
  macros: z.tuple([finite.min(0).max(1), finite.min(0).max(1), finite.min(0).max(1), finite.min(0).max(1)]),
  macroNames: z
    .tuple([z.string().min(1).max(24), z.string().min(1).max(24), z.string().min(1).max(24), z.string().min(1).max(24)])
    .default(['Macro 1', 'Macro 2', 'Macro 3', 'Macro 4']),
  modulation: ModulationRoutesSchema,
  inserts: z.strictObject({
    drive: finite.min(0).max(1),
    driveBypass: z.boolean().default(false),
    chorus: finite.min(0).max(1),
    chorusBypass: z.boolean().default(false),
    reverb: finite.min(0).max(1).default(0),
    reverbBypass: z.boolean().default(false)
  })
}

export const TonePatchSchema = z.discriminatedUnion('synthType', [
  z.strictObject({ ...tone, synthType: z.literal('synth'), options: z.strictObject(toneBase) }),
  z.strictObject({
    ...tone,
    synthType: z.literal('mono'),
    options: z.strictObject({ ...toneBase, filter, filterEnvelope })
  }),
  z.strictObject({ ...tone, synthType: z.literal('am'), options: z.strictObject({ ...toneBase, ...toneModulation }) }),
  z.strictObject({
    ...tone,
    synthType: z.literal('fm'),
    options: z.strictObject({ ...toneBase, ...toneModulation, modulationIndex: finite.min(0).max(32) })
  })
])
export const SynthPatchSchema = z.union([TonePatchSchema, z.strictObject(native)])

export type SynthPatch = z.infer<typeof SynthPatchSchema>
export type ToneSynthPatch = Extract<SynthPatch, { backend: 'tone' }>
export type NativeSynthPatch = Extract<SynthPatch, { backend: 'native-subtractive' }>
export function parseSynthPatch(value: unknown): SynthPatch {
  return SynthPatchSchema.parse(value)
}
