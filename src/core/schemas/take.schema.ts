import { z } from 'zod'
import { PROJECT_BAR_BOUNDS } from '../../config/defaults'
import { GeneratorParamsSchema } from './generator.schema'
import { AppNoteSchema } from './note.schema'

export const SeedSchema = z.number().int().min(0).max(0xffffffff)

export const TakeContextSchema = z.object({
  key: z.string().min(1),
  scale: z.string().min(1),
  bpm: z.number().min(40).max(280),
  bars: z.number().int().min(PROJECT_BAR_BOUNDS.min).max(PROJECT_BAR_BOUNDS.max),
  rangeStartStep: z.number().min(0).optional(),
  rangeEndStep: z.number().positive().optional()
})

export const TakeSnapshotSchema = z.object({
  id: z.string().min(1),
  seed: SeedSchema,
  createdAt: z.number().int().min(0),
  locked: z.boolean().default(false),
  score: z.number().nullable().default(null),
  notes: z.array(AppNoteSchema),
  arpVariations: z.array(z.object({ mode: z.enum(['pitches', 'feel']), seed: SeedSchema })).optional(),
  params: GeneratorParamsSchema,
  context: TakeContextSchema
})

export type TakeSnapshot = z.infer<typeof TakeSnapshotSchema>
export type TakeContext = z.infer<typeof TakeContextSchema>
