import { z } from 'zod'

export const AppNoteSchema = z.object({
  id: z.uuid(),
  pitch: z.string(),
  midi: z.number().int().min(0).max(127),
  step: z.number().int().min(0),
  durationSteps: z.number().positive(),
  velocity: z.number().int().min(1).max(127).default(100),
  isMuted: z.boolean().default(false)
})

export type AppNote = z.infer<typeof AppNoteSchema>
