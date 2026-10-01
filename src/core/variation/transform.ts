import type { AppNote } from '../schemas/note.schema'
import { STEPS_PER_BAR } from '../schemas/project.schema'
import { midiToPitch } from '../theory/scale.engine'
import { chronological, clamp, inRegion, integerOnset, validateContext } from './helpers'
import { transformPitchTargets, transformUnavailableReason } from './transform-pitches'
import type { TransformOp, VariationContext } from './types'

export function transformNotes(notes: readonly AppNote[], op: TransformOp, ctx: VariationContext): AppNote[] {
  validateContext(ctx)
  const ordered = chronological(notes)
  const region = ordered.filter((note) => inRegion(note, ctx))
  if (!region.length) return ordered.map((note) => ({ ...note }))
  if (transformUnavailableReason(ordered, op, ctx)) return ordered.map((note) => ({ ...note }))
  const targets = transformPitchTargets(region, op, ctx)
  const targetById = targets ? new Map(region.map((note, index) => [note.id, targets[index]!])) : null
  const transformed = ordered.flatMap((original) => {
    if (!inRegion(original, ctx)) return [{ ...original }]
    const note = {
      ...original,
      durationSteps: Math.min(original.durationSteps, ctx.regionEndStep - original.step)
    }
    if (targetById) {
      const midi = targetById.get(note.id)!
      return [{ ...note, midi, pitch: midi === note.midi ? note.pitch : midiToPitch(midi) }]
    }
    switch (op) {
      case 'reverse':
        return [
          {
            ...note,
            step: integerOnset(
              ctx.regionStartStep + ctx.regionEndStep - note.step - note.durationSteps,
              note.durationSteps,
              ctx
            )
          }
        ]
      case 'displace-forward':
      case 'displace-back':
        return [
          {
            ...note,
            step: integerOnset(
              note.step + (op === 'displace-forward' ? ctx.snapStep : -ctx.snapStep),
              note.durationSteps,
              ctx
            )
          }
        ]
      case 'double':
      case 'halve': {
        const factor = op === 'double' ? 2 : 0.5
        const step = ctx.regionStartStep + Math.round((note.step - ctx.regionStartStep) * factor)
        if (ctx.regionEndStep - step < 0.25) return []
        const durationSteps = Math.min(
          clamp(note.durationSteps * factor, ctx.snapStep, 2 * STEPS_PER_BAR),
          ctx.regionEndStep - step
        )
        // Rests are timeline gaps; leaving the tail empty pads to the fixed region end.
        return [{ ...note, step, durationSteps }]
      }
      default:
        return [note]
    }
  })
  return chronological(transformed)
}
