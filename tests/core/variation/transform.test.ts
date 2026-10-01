import { describe, expect, it } from 'vitest'
import { AppNoteSchema, type AppNote } from '@/core/schemas/note.schema'
import { isNoteInScale, midiToPitch } from '@/core/theory/scale.engine'
import { transformNotes } from '@/core/variation/transform'
import { transformUnavailableReason } from '@/core/variation'
import type { TransformOp, VariationContext } from '@/core/variation/types'

const context: VariationContext = {
  key: 'C',
  scale: 'major',
  minOctave: 3,
  maxOctave: 5,
  snapStep: 1,
  regionStartStep: 8,
  regionEndStep: 24
}

function note(id: string, step: number, midi: number, durationSteps = 2): AppNote {
  return { id, pitch: midiToPitch(midi), midi, step, durationSteps, velocity: 90, isMuted: false }
}

const phrase = [
  note('00000000-0000-4000-8000-000000000001', 9, 60, 2),
  note('00000000-0000-4000-8000-000000000002', 14, 64, 3),
  note('00000000-0000-4000-8000-000000000003', 20, 67, 2)
]

function apply(op: TransformOp, notes = phrase, ctx = context): AppNote[] {
  return transformNotes(notes, op, ctx)
}

describe('transformNotes', () => {
  it.each(['reverse', 'displace-forward', 'displace-back', 'double', 'halve'] as const)(
    '%s keeps fractional gate lengths valid across repeated applications',
    (op) => {
      const ctx = { ...context, regionStartStep: 0, regionEndStep: 16.5 }
      let notes = [note(phrase[0].id, 4, 60, 1.5), note(phrase[1].id, 15, 64, 1.5)]
      for (let application = 0; application < 4; application++) {
        notes = apply(op, notes, ctx)
        for (const item of notes) {
          expect(AppNoteSchema.safeParse(item).success).toBe(true)
          expect(item.step + item.durationSteps).toBeLessThanOrEqual(ctx.regionEndStep)
        }
      }
    }
  )

  it('returns a fresh array and leaves input notes untouched', () => {
    const input = phrase.map((item) => ({ ...item }))
    const before = structuredClone(input)
    const result = apply('one-up', input)

    expect(result).not.toBe(input)
    expect(input).toEqual(before)
  })

  it('mirrors reverse on the region boundaries and is involutive with gaps and a nonzero region start', () => {
    const once = apply('reverse')

    expect(once.map(({ id, step, durationSteps }) => ({ id, step, durationSteps }))).toEqual([
      { id: phrase[2].id, step: 10, durationSteps: 2 },
      { id: phrase[1].id, step: 15, durationSteps: 3 },
      { id: phrase[0].id, step: 21, durationSteps: 2 }
    ])
    expect(apply('reverse', once)).toEqual(phrase)
    expect(once.map((item) => item.step)).toEqual([...once].map((item) => item.step).sort((a, b) => a - b))
  })

  it('inverts diatonic intervals around the first note and is involutive when unclamped', () => {
    const notes = [note(phrase[0].id, 8, 60), note(phrase[1].id, 11, 64), note(phrase[2].id, 15, 65)]
    const once = apply('invert', notes)

    expect(once.map((item) => item.midi)).toEqual([60, 57, 55])
    expect(apply('invert', once)).toEqual(notes)
  })

  it.each([
    ['one-up', 1],
    ['one-down', -1]
  ] as const)('%s moves each pitch by scale degrees and keeps rhythm', (op, _degreeOffset) => {
    const result = apply(op)
    const expectedMidi: Record<typeof op, number[]> = {
      'one-up': [62, 65, 69],
      'one-down': [59, 62, 65]
    }

    expect(result.map(({ step, durationSteps }) => [step, durationSteps])).toEqual(
      phrase.map(({ step, durationSteps }) => [step, durationSteps])
    )
    expect(result.every((item) => isNoteInScale(item.pitch, context.key, context.scale))).toBe(true)
    expect(result.map((item) => item.midi)).toEqual(expectedMidi[op])
  })

  it('keeps transformed pitches in scale for an exotic scale across every operation', () => {
    const ctx = { ...context, key: 'C', scale: 'hungarian minor' }
    const notes = [note(phrase[0].id, 8, 60), note(phrase[1].id, 12, 63), note(phrase[2].id, 17, 66)]

    for (const op of [
      'invert',
      'reverse',
      'one-up',
      'one-down',
      'double',
      'halve',
      'octave-up',
      'octave-down',
      'displace-forward',
      'displace-back'
    ] as const) {
      const result = apply(op, notes, ctx)
      expect(result.every((item) => isNoteInScale(item.pitch, ctx.key, ctx.scale))).toBe(true)
    }
  })

  it.each([
    ['double', 4],
    ['halve', 1]
  ] as const)('%s scales note durations while retaining the region bounds', (op, expectedDuration) => {
    const notes = [note(phrase[0].id, 8, 60, 2), note(phrase[1].id, 14, 64, 2)]
    const result = apply(op, notes)

    expect(result.map((item) => item.durationSteps)).toEqual([expectedDuration, expectedDuration])
    expect(
      result.every(
        (item) => item.step >= context.regionStartStep && item.step + item.durationSteps <= context.regionEndStep
      )
    ).toBe(true)
    expect(result.map((item) => item.id)).toEqual(notes.map((item) => item.id))
  })

  it('trims doubling at the region end and clamps durations to two bars', () => {
    const shortRegion = { ...context, regionStartStep: 0, regionEndStep: 8 }
    const nearEnd = [note(phrase[0].id, 3, 60, 5)]
    const trimmed = apply('double', nearEnd, shortRegion)

    expect(trimmed).toHaveLength(1)
    expect(trimmed[0].durationSteps).toBe(2)
    expect(trimmed[0].step + trimmed[0].durationSteps).toBe(shortRegion.regionEndStep)

    const overhanging = [note(phrase[0].id, 6, 60, 2)]
    expect(apply('double', overhanging, shortRegion)).toEqual([])

    const longNote = [note(phrase[0].id, 0, 60, 20)]
    const capped = apply('double', longNote, { ...context, regionStartStep: 0, regionEndStep: 64 })
    expect(capped[0].durationSteps).toBeLessThanOrEqual(32)
  })

  it('keeps halved durations at least one snap and pads silence implicitly', () => {
    const notes = [note(phrase[0].id, 8, 60, 1)]
    const result = apply('halve', notes, { ...context, snapStep: 1 })

    expect(result[0].durationSteps).toBeGreaterThanOrEqual(1)
    expect(result).toHaveLength(1)
    expect(result[0].step).toBe(8)
  })

  it.each([
    ['octave-up', 83],
    ['octave-down', 48]
  ] as const)('%s leaves pitches unchanged when the whole shift exceeds the register', (op, _boundaryMidi) => {
    const boundary = [note(phrase[0].id, 10, op === 'octave-up' ? 83 : 48)]
    const result = apply(op, boundary)

    expect(result).toEqual(boundary)
    expect(result).not.toBe(boundary)
    expect(result[0].step).toBe(boundary[0].step)
  })

  it.each([
    ['octave-up', 60, 72],
    ['octave-down', 72, 60]
  ] as const)('%s shifts an in-range pitch by one octave', (op, inputMidi, expectedMidi) => {
    const result = apply(op, [note(phrase[0].id, 10, inputMidi)])
    expect(result[0].midi).toBe(expectedMidi)
  })

  it('leaves inversion unchanged when any target pitch exceeds the register', () => {
    const notes = [note(phrase[0].id, 8, 48), note(phrase[1].id, 12, 83)]
    const result = apply('invert', notes)
    expect(result).toEqual(notes)
    expect(result).not.toBe(notes)
  })

  it('blocks octave shifts that cannot fit a one-octave register and reports pitch failures', () => {
    const narrow = { ...context, minOctave: 4, maxOctave: 4 }
    const notes = [note(phrase[0].id, 10, 60)]

    expect(apply('octave-up', notes, narrow)).toEqual(notes)
    expect(apply('octave-down', notes, narrow)).toEqual(notes)
    expect(transformUnavailableReason(notes, 'octave-up', narrow)).toBe('register')
    expect(transformUnavailableReason([note(phrase[0].id, 10, 71)], 'one-up', narrow)).toBe('register')
    expect(transformUnavailableReason([], 'octave-up', narrow)).toBe('empty')
    expect(transformUnavailableReason(notes, 'reverse', narrow)).toBeNull()
  })

  it('blocks an operation atomically when one in-region pitch target is out of bounds', () => {
    const cases: Array<[TransformOp, AppNote[]]> = [
      ['invert', [note(phrase[0].id, 9, 60), note(phrase[1].id, 14, 83)]],
      ['one-up', [note(phrase[0].id, 9, 60), note(phrase[1].id, 14, 83)]]
    ]

    for (const [op, notes] of cases) {
      expect(apply(op, notes)).toEqual(notes)
      expect(transformUnavailableReason(notes, op, context)).toBe('register')
    }
  })

  it('preserves contour, intervals, and reversibility for in-range octave shifts', () => {
    const notes = [note(phrase[0].id, 9, 60), note(phrase[1].id, 14, 64), note(phrase[2].id, 20, 67)]
    const raised = apply('octave-up', notes)
    expect(raised.map((item) => item.midi)).toEqual([72, 76, 79])
    expect(raised.map((item, index) => item.midi - notes[index].midi)).toEqual([12, 12, 12])
    expect(apply('octave-down', raised)).toEqual(notes)
  })

  it('ignores pitches outside the affected time region when checking availability', () => {
    const outside = note('00000000-0000-4000-8000-000000000004', 26, 127)
    const notes = [...phrase, outside]

    expect(transformUnavailableReason(notes, 'one-up', context)).toBeNull()
    expect(apply('one-up', notes).find((item) => item.id === outside.id)).toEqual(outside)
  })

  it('returns a fresh empty result for empty input', () => {
    const empty: AppNote[] = []
    const result = apply('reverse', empty)
    expect(result).toEqual([])
    expect(result).not.toBe(empty)
  })

  it('displaces onsets by one snap and clamps them to region edges', () => {
    const edgeNotes = [note(phrase[0].id, 8, 60, 2), note(phrase[1].id, 22, 64, 2)]

    expect(apply('displace-back', edgeNotes).map((item) => item.step)).toEqual([8, 21])
    expect(apply('displace-forward', edgeNotes).map((item) => item.step)).toEqual([9, 22])
    expect(apply('displace-back', edgeNotes).map((item) => item.durationSteps)).toEqual([2, 2])
  })

  it('preserves notes outside the affected region', () => {
    const outside = note('00000000-0000-4000-8000-000000000004', 26, 62, 1)
    const notes = [...phrase, outside]

    expect(apply('one-up', notes).find((item) => item.id === outside.id)).toEqual(outside)
  })

  it('produces identical results for repeated deterministic calls', () => {
    for (const op of [
      'invert',
      'reverse',
      'one-up',
      'one-down',
      'double',
      'halve',
      'octave-up',
      'octave-down',
      'displace-forward',
      'displace-back'
    ] as const) {
      expect(apply(op)).toEqual(apply(op))
    }
  })
})
