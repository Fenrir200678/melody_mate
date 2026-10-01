import { describe, expect, it, vi } from 'vitest'
import { createRng } from '@/core/generator/rng'
import { AppNoteSchema, type AppNote } from '@/core/schemas/note.schema'
import { isNoteInScale, midiToPitch } from '@/core/theory/scale.engine'
import { mutateNotes, type MutationAxes, type VariationContext } from '@/core/variation'

const context: VariationContext = {
  key: 'C',
  scale: 'major',
  minOctave: 3,
  maxOctave: 5,
  snapStep: 1,
  regionStartStep: 8,
  regionEndStep: 24
}
const none: MutationAxes = { rhythm: false, pitch: false, ornament: false, simplify: false }
const all: MutationAxes = { rhythm: true, pitch: true, ornament: true, simplify: true }
const axis = (name: keyof MutationAxes): MutationAxes => ({ ...none, [name]: true })
const note = (id: number, step: number, durationSteps: number, midi = 60): AppNote => ({
  id: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
  step,
  durationSteps,
  midi,
  pitch: midiToPitch(midi),
  velocity: 90,
  isMuted: false
})
const phrase = [note(1, 8, 4), note(2, 14, 2, 64), note(3, 20, 4, 67)]
const totalDuration = (notes: AppNote[]): number => notes.reduce((total, item) => total + item.durationSteps, 0)
const rhythm = (notes: AppNote[]) => notes.map(({ step, durationSteps }) => [step, durationSteps])
function draws(...values: number[]): () => number {
  let index = 0
  return () => values[index++] ?? 0.99
}
function expectBounds(notes: AppNote[], ctx = context): void {
  for (const item of notes) {
    expect(item.step).toBeGreaterThanOrEqual(ctx.regionStartStep)
    expect(item.step + item.durationSteps).toBeLessThanOrEqual(ctx.regionEndStep)
    expect(item.midi).toBeGreaterThanOrEqual((ctx.minOctave + 1) * 12)
    expect(item.midi).toBeLessThan((ctx.maxOctave + 2) * 12)
    expect(isNoteInScale(item.pitch, ctx.key, ctx.scale)).toBe(true)
  }
}

describe('mutateNotes', () => {
  it.each(['rhythm', 'ornament', 'simplify'] as const)(
    '%s keeps fractional gate lengths valid across repeated applications',
    (name) => {
      const ctx = { ...context, regionStartStep: 0, regionEndStep: 16.5 }
      for (let seed = 0; seed < 12; seed++) {
        let notes = [note(1, 0, 1.5), note(2, 4, 3.5, 64), note(3, 15, 1.5, 67)]
        const rng = createRng(seed)
        for (let application = 0; application < 4; application++) {
          notes = mutateNotes(notes, axis(name), 1, ctx, rng)
          for (const item of notes) {
            expect(AppNoteSchema.safeParse(item).success).toBe(true)
            expectBounds([item], ctx)
          }
        }
      }
    }
  )

  it('returns an immutable identity without consuming randomness at zero strength or with no axes', () => {
    const rng = vi.fn(() => 0)
    for (const [axes, strength] of [
      [all, 0],
      [none, 1]
    ] as const) {
      const result = mutateNotes(phrase, axes, strength, context, rng)
      expect(result).toEqual(phrase)
      expect(result).not.toBe(phrase)
      expect(result[0]).not.toBe(phrase[0])
    }
    expect(rng).not.toHaveBeenCalled()
  })

  it('does not mutate frozen input notes', () => {
    const input = Object.freeze(phrase.map((item) => Object.freeze({ ...item })))
    mutateNotes(input, all, 1, context, createRng(10))
    expect(input).toEqual(phrase)
  })

  it('reproduces all mutation axes including split identifiers with the same seed', () => {
    const first = mutateNotes(phrase, all, 0.8, context, createRng(39))
    expect(mutateNotes(phrase, all, 0.8, context, createRng(39))).toEqual(first)
    expect(mutateNotes(phrase, all, 0.8, context, createRng(40))).not.toEqual(first)
  })

  it('moves an onset by one snap without changing pitch or duration', () => {
    const result = mutateNotes(phrase, axis('rhythm'), 1, context, draws(0, 0, 0.9))
    expect(result[0]).toEqual({ ...phrase[0], step: 9 })
    expect(totalDuration(result)).toBe(totalDuration(phrase))
    expect(result.map((item) => item.midi)).toEqual(phrase.map((item) => item.midi))
  })

  it('retains enharmonic spelling on the rhythm axis', () => {
    const input = [{ ...note(1, 10, 2, 63), pitch: 'D#4' }]
    const result = mutateNotes(input, axis('rhythm'), 1, { ...context, scale: 'hungarian minor' }, () => 0)
    expect(result[0].pitch).toBe('D#4')
    expect(result[0].midi).toBe(63)
  })

  it('rejects onset collisions and clamps movement to both region boundaries', () => {
    const adjacent = [note(1, 8, 4), note(2, 12, 4, 62), note(3, 20, 4, 64)]
    const result = mutateNotes(adjacent, axis('rhythm'), 1, context, draws(0, 0, 0.9, 0, 0, 0, 0, 0, 0.9))
    expect(result).toEqual(adjacent)
    const backward = mutateNotes([phrase[0]], axis('rhythm'), 1, context, () => 0)
    expect(backward[0].step).toBe(8)
  })

  it('swaps neighboring durations while retaining gaps and their combined span', () => {
    const result = mutateNotes(phrase, axis('rhythm'), 1, context, draws(0, 0.3))
    expect(rhythm(result).slice(0, 2)).toEqual([
      [8, 2],
      [12, 4]
    ])
    expect(totalDuration(result)).toBe(totalDuration(phrase))
    expect(result.map((item) => item.midi)).toEqual(phrase.map((item) => item.midi))
  })

  it('splits short notes with unique schema-valid deterministic identifiers', () => {
    const input = [note(1, 8, 2), note(2, 12, 2, 64)]
    const result = mutateNotes(input, axis('rhythm'), 1, context, () => 0.6)
    expect(result).toHaveLength(4)
    expect(rhythm(result)).toEqual([
      [8, 1],
      [9, 1],
      [12, 1],
      [13, 1]
    ])
    expect(new Set(result.map((item) => item.id)).size).toBe(4)
    for (const item of result) expect(AppNoteSchema.safeParse(item).success).toBe(true)
    expect(totalDuration(result)).toBe(4)
    expect(mutateNotes(input, axis('rhythm'), 1, context, () => 0.6)).toEqual(result)
  })

  it('merges adjacent short repetitions without discarding different pitches', () => {
    const input = [note(1, 8, 1), note(2, 9, 1), note(3, 10, 1, 62)]
    const result = mutateNotes(input, axis('rhythm'), 1, context, () => 0.9)
    expect(result).toHaveLength(2)
    expect(result[0].durationSteps).toBe(2)
    expect(result[1].midi).toBe(62)
    expect(totalDuration(result)).toBe(3)
  })

  it('walks pitch by one or two scale degrees with unchanged rhythm', () => {
    const result = mutateNotes(phrase, axis('pitch'), 1, context, () => 0)
    expect(result.map((item) => item.midi)).toEqual([62, 65, 69])
    expect(rhythm(result)).toEqual(rhythm(phrase))
    const twoSteps = mutateNotes([phrase[0]], axis('pitch'), 1, context, draws(0, 0.9, 0.9, 0.9))
    expect(twoSteps[0].midi).toBe(64)
  })

  it('bounces away from neighbour degrees instead of repeating their pitch', () => {
    const input = [note(1, 8, 4, 60), note(2, 14, 2, 62), note(3, 20, 4, 64)]
    for (let seed = 0; seed < 60; seed++) {
      const result = mutateNotes(input, axis('pitch'), 1, context, createRng(seed))
      for (let index = 1; index < result.length; index++) {
        expect(result[index].midi).not.toBe(result[index - 1].midi)
      }
    }
  })

  it('uses strength as the per-note mutation probability', () => {
    const result = mutateNotes(phrase, axis('pitch'), 0.25, context, () => 0.5)
    expect(result).toEqual(phrase)
    expect(mutateNotes(phrase, axis('pitch'), 1, context, () => 0.5)).not.toEqual(phrase)
  })

  it('inserts a passing tone by sharing the host duration and preserves original onsets', () => {
    const result = mutateNotes(phrase, axis('ornament'), 1, context, () => 0)
    expect(result).toHaveLength(6)
    expect(result[0].step).toBe(8)
    expect(result[1].step).toBe(11)
    expect(result[1].midi).toBe(62)
    expect(result[1].durationSteps).toBe(1)
    for (const original of phrase) expect(result.some((item) => item.step === original.step)).toBe(true)
    expect(totalDuration(result)).toBe(totalDuration(phrase))
    expectBounds(result)
  })

  it('uses half-strength probability for ornaments', () => {
    expect(mutateNotes(phrase, axis('ornament'), 1, context, () => 0.5)).toEqual(phrase)
    expect(mutateNotes(phrase, axis('ornament'), 0.5, context, () => 0.3)).toEqual(phrase)
    expect(mutateNotes(phrase, axis('ornament'), 1, context, () => 0.3)).toHaveLength(6)
  })

  it('simplifies adjacent repetitions but retains rests and muted boundaries', () => {
    const input = [note(1, 8, 2), note(2, 10, 2), note(3, 16, 2), { ...note(4, 18, 2), isMuted: true }]
    const result = mutateNotes(input, axis('simplify'), 1, context, () => 0)
    expect(result).toHaveLength(3)
    expect(result[0].durationSteps).toBe(4)
    expect(result[1].step).toBe(16)
    expect(result[2].isMuted).toBe(true)
    expect(totalDuration(result)).toBe(totalDuration(input))
  })

  it('merges short offbeat ornaments into a touching neighbor', () => {
    const input = [note(1, 8, 1), note(2, 9, 1, 62)]
    const result = mutateNotes(input, axis('simplify'), 1, { ...context, snapStep: 2 }, () => 0)
    expect(result).toEqual([{ ...input[0], durationSteps: 2 }])
  })

  it('snaps syncopation to a beat when there is room and rejects collisions', () => {
    const result = mutateNotes([note(1, 13, 2)], axis('simplify'), 1, context, () => 0)
    expect(result[0].step).toBe(12)
    const input = [note(1, 8, 4), note(2, 13, 2, 64), note(3, 16, 2, 67)]
    expect(mutateNotes(input, axis('simplify'), 1, context, () => 0)[1].step).toBe(12)
    const blocked = [note(1, 8, 5), note(2, 13, 2, 64)]
    expect(mutateNotes(blocked, axis('simplify'), 1, context, () => 0)).toEqual(blocked)
  })

  it('applies combined axes in rhythm, pitch, ornament, simplify order', () => {
    const rngCombined = createRng(9)
    const combined = mutateNotes(phrase, all, 1, context, rngCombined)
    const rngSeparate = createRng(9)
    let separate = phrase
    for (const name of ['rhythm', 'pitch', 'ornament', 'simplify'] as const) {
      separate = mutateNotes(separate, axis(name), 1, context, rngSeparate)
    }
    expect(combined.map(({ id: _id, ...item }) => item)).toEqual(separate.map(({ id: _id, ...item }) => item))
  })

  it('keeps all axes inside the fixed region and exotic scale register across seeds', () => {
    const ctx = { ...context, key: 'F#', scale: 'hungarian minor', minOctave: 4, maxOctave: 4 }
    const input = [note(1, 8, 4, 40), note(2, 14, 2, 90), note(3, 20, 4, 63)]
    for (let seed = 0; seed < 50; seed++) {
      const result = mutateNotes(input, all, 1, ctx, createRng(seed))
      expectBounds(result, ctx)
      expect(totalDuration(result)).toBe(totalDuration(input))
      for (let index = 1; index < result.length; index++) {
        expect(result[index].step).toBeGreaterThanOrEqual(result[index - 1].step + result[index - 1].durationSteps)
      }
    }
  })

  it('preserves notes outside the region', () => {
    const outside = [note(4, 0, 4, 30), note(5, 24, 4, 100)]
    const result = mutateNotes([...outside, ...phrase], all, 1, context, createRng(39))
    for (const original of outside) expect(result.find((item) => item.id === original.id)).toEqual(original)
  })

  it('handles empty inputs and bounds strength', () => {
    expect(mutateNotes([], all, 1, context, createRng(1))).toEqual([])
    expect(mutateNotes(phrase, all, -1, context, createRng(1))).toEqual(phrase)
    expect(mutateNotes(phrase, all, 2, context, createRng(1))).toEqual(
      mutateNotes(phrase, all, 1, context, createRng(1))
    )
    expect(() => mutateNotes(phrase, all, NaN, context)).toThrow(RangeError)
  })
})
