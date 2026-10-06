import { z } from 'zod'
import { DEFAULT_GENERATOR_PARAMS } from '../../config/defaults'
import { SubdivisionEnum } from './project.schema'

export const MotifPatternEnum = z.enum(['FREE', 'ABAB', 'ABAC', 'AABA', 'AAAB', 'AABC', 'ABCB'])
export type MotifPattern = z.infer<typeof MotifPatternEnum>

export const ContourEnum = z.enum(['free', 'ascending', 'descending', 'arch', 'valley'])
export type Contour = z.infer<typeof ContourEnum>

export const AnswerStyleEnum = z.enum(['echo', 'continue', 'contrast'])
export type AnswerStyle = z.infer<typeof AnswerStyleEnum>

export const RhythmModeEnum = z.enum(['preset', 'euclidean', 'custom'])
export type RhythmMode = z.infer<typeof RhythmModeEnum>

export const ArpPatternEnum = z.enum([
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
export type ArpPattern = z.infer<typeof ArpPatternEnum>

export const ArpRateEnum = z.enum(['1/4', '1/8', '1/16', '1/8d', '1/4d'])
export type ArpRate = z.infer<typeof ArpRateEnum>

export const ArpOctaveModeEnum = z.enum(['up', 'down', 'alternate', 'zigzag'])
export type ArpOctaveMode = z.infer<typeof ArpOctaveModeEnum>

/** Where the arpeggio pitch pool comes from: rebuilt pitch classes or the absolute Chord Studio voicing. */
export const ArpPitchSourceEnum = z.enum(['pitch-classes', 'chord-voicing'])
export type ArpPitchSource = z.infer<typeof ArpPitchSourceEnum>

export const GeneratorParamsSchema = z
  .object({
    minOctave: z.number().int().min(1).max(7).default(DEFAULT_GENERATOR_PARAMS.minOctave),
    maxOctave: z.number().int().min(1).max(7).default(DEFAULT_GENERATOR_PARAMS.maxOctave),
    motif: MotifPatternEnum.default(DEFAULT_GENERATOR_PARAMS.motif),
    motifVariation: z.number().min(0).max(1).default(DEFAULT_GENERATOR_PARAMS.motifVariation),
    callAndResponse: z.boolean().default(DEFAULT_GENERATOR_PARAMS.callAndResponse),
    answerStyle: AnswerStyleEnum.default(DEFAULT_GENERATOR_PARAMS.answerStyle),
    answerVariation: z.number().min(0).max(1).default(DEFAULT_GENERATOR_PARAMS.answerVariation),
    markovOrder: z.number().int().min(1).max(4).default(DEFAULT_GENERATOR_PARAMS.markovOrder),
    rhythmMode: RhythmModeEnum.default(DEFAULT_GENERATOR_PARAMS.rhythmMode),
    rhythmPresetId: z.string().default(DEFAULT_GENERATOR_PARAMS.rhythmPresetId),
    euclideanPulses: z.number().int().min(1).max(32).default(DEFAULT_GENERATOR_PARAMS.euclideanPulses),
    euclideanSteps: z.number().int().min(1).max(32).default(DEFAULT_GENERATOR_PARAMS.euclideanSteps),
    euclideanRotation: z.number().int().min(0).max(31).default(DEFAULT_GENERATOR_PARAMS.euclideanRotation),
    euclideanSubdivision: SubdivisionEnum.default(DEFAULT_GENERATOR_PARAMS.euclideanSubdivision),
    restProbability: z.number().min(0).max(1).default(DEFAULT_GENERATOR_PARAMS.restProbability),
    noteLength: z.number().min(0.25).max(1).default(DEFAULT_GENERATOR_PARAMS.noteLength),
    noteLengthVariation: z.number().min(0).max(1).default(DEFAULT_GENERATOR_PARAMS.noteLengthVariation),
    accentStrength: z.number().min(0).max(1).default(DEFAULT_GENERATOR_PARAMS.accentStrength),
    velocityVariation: z.number().min(0).max(1).default(DEFAULT_GENERATOR_PARAMS.velocityVariation),
    contour: ContourEnum.default(DEFAULT_GENERATOR_PARAMS.contour),
    contourStrength: z.number().min(0).max(1).default(DEFAULT_GENERATOR_PARAMS.contourStrength),
    pentatonicMode: z.boolean().default(DEFAULT_GENERATOR_PARAMS.pentatonicMode),
    randomRhythmPreset: z.boolean().default(DEFAULT_GENERATOR_PARAMS.randomRhythmPreset),
    chordAdherence: z.number().min(0).max(1).default(DEFAULT_GENERATOR_PARAMS.chordAdherence),
    startWithRoot: z.boolean().default(DEFAULT_GENERATOR_PARAMS.startWithRoot),
    endWithRoot: z.boolean().default(DEFAULT_GENERATOR_PARAMS.endWithRoot),
    arpPattern: ArpPatternEnum.default(DEFAULT_GENERATOR_PARAMS.arpPattern),
    arpRate: ArpRateEnum.default(DEFAULT_GENERATOR_PARAMS.arpRate),
    arpOctaveRange: z.number().int().min(1).max(4).default(DEFAULT_GENERATOR_PARAMS.arpOctaveRange),
    arpOctaveMode: ArpOctaveModeEnum.default(DEFAULT_GENERATOR_PARAMS.arpOctaveMode),
    arpBaseOctave: z.number().int().min(1).max(6).default(DEFAULT_GENERATOR_PARAMS.arpBaseOctave),
    arpPitchSource: ArpPitchSourceEnum.default(DEFAULT_GENERATOR_PARAMS.arpPitchSource),
    arpInversionCycling: z.boolean().default(DEFAULT_GENERATOR_PARAMS.arpInversionCycling),
    arpSeed: z.number().int().min(0).max(4_294_967_295).default(DEFAULT_GENERATOR_PARAMS.arpSeed),
    arpSeedLocked: z.boolean().default(DEFAULT_GENERATOR_PARAMS.arpSeedLocked),
    arpGate: z.number().int().min(20).max(100).default(DEFAULT_GENERATOR_PARAMS.arpGate),
    arpAdherence: z.number().int().min(0).max(100).default(DEFAULT_GENERATOR_PARAMS.arpAdherence),
    arpAccent: z.number().int().min(0).max(100).default(DEFAULT_GENERATOR_PARAMS.arpAccent),
    arpDensity: z.number().int().min(50).max(100).default(DEFAULT_GENERATOR_PARAMS.arpDensity)
  })
  .refine((data) => data.minOctave <= data.maxOctave, {
    message: 'minOctave must be less than or equal to maxOctave'
  })

export type GeneratorParams = z.infer<typeof GeneratorParamsSchema>

/**
 * Merges partial generator parameters into current parameters with octave boundary harmonization.
 */
export function resolveGeneratorParams(current: GeneratorParams, patch: Partial<GeneratorParams>): GeneratorParams {
  const next = {
    ...current,
    ...patch
  }
  if (patch.minOctave !== undefined && patch.maxOctave === undefined) {
    if (patch.minOctave > next.maxOctave) {
      next.maxOctave = patch.minOctave
    }
  } else if (patch.maxOctave !== undefined && patch.minOctave === undefined) {
    if (patch.maxOctave < next.minOctave) {
      next.minOctave = patch.maxOctave
    }
  }
  return GeneratorParamsSchema.parse(next)
}
