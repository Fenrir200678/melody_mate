import type { AppNote } from '../schemas/note.schema'
import { getScaleMidiNotes } from '../theory/scale.engine'
import { chronological, inRegion, validateContext } from './helpers'
import type { TransformOp, VariationContext } from './types'

export function transformPitchTargets(
  region: readonly AppNote[],
  op: TransformOp,
  ctx: VariationContext
): (number | undefined)[] | null {
  if (op !== 'invert' && op !== 'one-up' && op !== 'one-down' && !op.startsWith('octave-')) {
    return null
  }
  const scale = getScaleMidiNotes(ctx.key, ctx.scale)
  const degrees = region.map((note) =>
    scale.reduce(
      (best, midi, index) => (Math.abs(midi - note.midi) < Math.abs(scale[best] - note.midi) ? index : best),
      0
    )
  )
  return degrees.map((degree) => {
    if (op === 'invert') return scale[2 * degrees[0] - degree]
    if (op === 'octave-up' || op === 'octave-down') {
      const midi = scale[degree]
      return midi === undefined ? undefined : midi + (op === 'octave-up' ? 12 : -12)
    }
    return scale[degree + (op === 'one-up' ? 1 : -1)]
  })
}

export function transformUnavailableReason(
  notes: readonly AppNote[],
  op: TransformOp,
  ctx: VariationContext
): 'empty' | 'register' | null {
  validateContext(ctx)
  const region = chronological(notes.filter((note) => inRegion(note, ctx)))
  if (!region.length) return 'empty'
  const targets = transformPitchTargets(region, op, ctx)
  const minMidi = Math.max(0, (ctx.minOctave + 1) * 12)
  const maxMidi = Math.min(127, (ctx.maxOctave + 2) * 12 - 1)
  return targets?.some((midi) => midi === undefined || midi < minMidi || midi > maxMidi) ? 'register' : null
}
