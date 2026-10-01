import { z } from 'zod'

export const CUSTOM_RHYTHM_STEPS_PER_BAR = 16

export const CustomRhythmEventSchema = z
  .object({
    step: z.number().int().min(0),
    lengthSteps: z.number().int().positive(),
    velocity: z.number().int().min(1).max(127)
  })
  .strict()

export const CustomRhythmPatternSchema = z
  .object({
    bars: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    events: z.array(CustomRhythmEventSchema)
  })
  .strict()
  .superRefine((pattern, context) => {
    const patternEnd = pattern.bars * CUSTOM_RHYTHM_STEPS_PER_BAR
    let previous: { step: number; lengthSteps: number } | undefined

    pattern.events.forEach((event, index) => {
      if (event.step + event.lengthSteps > patternEnd) {
        context.addIssue({ code: 'custom', path: ['events', index], message: 'Event extends beyond the pattern end' })
      }
      if (previous) {
        if (event.step <= previous.step) {
          context.addIssue({
            code: 'custom',
            path: ['events', index, 'step'],
            message: 'Events must be ordered by unique onset'
          })
        }
        if (event.step < previous.step + previous.lengthSteps) {
          context.addIssue({ code: 'custom', path: ['events', index], message: 'Events must not overlap' })
        }
      }
      previous = event
    })
  })

export const SavedCustomRhythmPresetSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(60),
    pattern: CustomRhythmPatternSchema
  })
  .strict()

export const SavedCustomRhythmPresetsSchema = z.array(SavedCustomRhythmPresetSchema)

export type CustomRhythmEvent = z.infer<typeof CustomRhythmEventSchema>
export type CustomRhythmPattern = z.infer<typeof CustomRhythmPatternSchema>
export type SavedCustomRhythmPreset = z.infer<typeof SavedCustomRhythmPresetSchema>
