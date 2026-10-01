import { describe, expect, it } from 'vitest'
import { AppNoteSchema, type AppNote } from '../../../src/core/schemas/note.schema'
import {
  mergeWorkRangeVariation,
  moveWorkRangeBySteps,
  normalizeWorkRange,
  notesInWorkRange,
  replaceNotesInWorkRange,
  resizeWorkRangeEdge,
  workRangeFromDrag
} from '../../../src/core/generator/work-range'

const note = (id: string, step: number): AppNote => ({
  id,
  pitch: 'C4',
  midi: 60,
  step,
  durationSteps: 1,
  velocity: 100,
  isMuted: false
})

describe('work range', () => {
  it('snaps reverse drags outward and clamps to project bounds', () => {
    expect(workRangeFromDrag(11, 5, 4, 16)).toEqual({ startStep: 4, endStep: 12 })
    expect(workRangeFromDrag(-3, 20, 4, 16)).toEqual({ startStep: 0, endStep: 16 })
  })

  it('normalizes fractional and empty ranges to at least one integer step', () => {
    expect(normalizeWorkRange({ startStep: 2.4, endStep: 2.4 }, 8)).toEqual({ startStep: 2, endStep: 3 })
    expect(normalizeWorkRange({ startStep: -4, endStep: 30 }, 8)).toEqual({ startStep: 0, endStep: 8 })
  })

  it('moves by integer steps in either direction while preserving range length', () => {
    const range = { startStep: 8, endStep: 14 }
    expect(moveWorkRangeBySteps(range, 1, 32)).toEqual({ startStep: 9, endStep: 15 })
    expect(moveWorkRangeBySteps(range, -1, 32)).toEqual({ startStep: 7, endStep: 13 })
    expect(moveWorkRangeBySteps(range, 1.9, 32)).toEqual({ startStep: 9, endStep: 15 })
  })

  it('clamps translation at project boundaries and handles invalid offsets', () => {
    const range = { startStep: 2, endStep: 7 }
    expect(moveWorkRangeBySteps(range, -100, 32)).toEqual({ startStep: 0, endStep: 5 })
    expect(moveWorkRangeBySteps(range, 100, 32)).toEqual({ startStep: 27, endStep: 32 })
    expect(moveWorkRangeBySteps(range, Number.NaN, 32)).toEqual(range)
    expect(moveWorkRangeBySteps(range, 1, Number.NaN)).toEqual({ startStep: 0, endStep: 0 })
  })

  it('resizes either edge while preserving the opposite edge', () => {
    const range = { startStep: 8, endStep: 14 }
    expect(resizeWorkRangeEdge(range, 'start', 10, 32)).toEqual({ startStep: 10, endStep: 14 })
    expect(resizeWorkRangeEdge(range, 'end', 18, 32)).toEqual({ startStep: 8, endStep: 18 })
  })

  it('keeps at least one step and clamps each edge to project limits', () => {
    const range = { startStep: 8, endStep: 14 }
    expect(resizeWorkRangeEdge(range, 'start', 20, 32)).toEqual({ startStep: 13, endStep: 14 })
    expect(resizeWorkRangeEdge(range, 'end', 3, 32)).toEqual({ startStep: 8, endStep: 9 })
    expect(resizeWorkRangeEdge(range, 'start', -100, 32)).toEqual({ startStep: 0, endStep: 14 })
    expect(resizeWorkRangeEdge(range, 'end', 100, 32)).toEqual({ startStep: 8, endStep: 32 })
  })

  it('uses the current edge for invalid steps and safely handles invalid project bounds', () => {
    const range = { startStep: 8, endStep: 14 }
    expect(resizeWorkRangeEdge(range, 'start', Number.NaN, 32)).toEqual(range)
    expect(resizeWorkRangeEdge(range, 'end', Number.POSITIVE_INFINITY, 32)).toEqual(range)
    expect(resizeWorkRangeEdge(range, 'start', 4, Number.NaN)).toEqual({ startStep: 0, endStep: 0 })
  })

  it('selects notes by onset within a half-open range regardless of scattered ids', () => {
    const notes = [note('outside-a', 1), note('inside-a', 4), note('outside-b', 7), note('inside-b', 5)]
    const selected = notesInWorkRange(notes, { startStep: 4, endStep: 6 })
    expect(selected.source).toEqual([notes[1], notes[3]])
    expect(selected.scope).toEqual({ startStep: 4, endStep: 6 })
    expect(notesInWorkRange(notes, { startStep: 2, endStep: 3 }).source).toEqual([])
  })

  it('replaces source notes and preserves outside notes in chronological order', () => {
    const notes = [
      note('00000000-0000-4000-8000-000000000009', 9),
      note('00000000-0000-4000-8000-000000000004', 4),
      note('00000000-0000-4000-8000-000000000001', 1)
    ]
    const source = [notes[1]]
    const varied = [note('replacement', 6)]
    expect(
      mergeWorkRangeVariation(notes, source, varied, { startStep: 3, endStep: 7 }).map(({ id, step }) => ({ id, step }))
    ).toEqual([
      { id: notes[2].id, step: 1 },
      { id: 'replacement', step: 6 },
      { id: notes[0].id, step: 9 }
    ])
  })

  it('clips varied note duration and preserves the source note tail with a collision-safe id', () => {
    const source = note('10000000-0000-4000-8000-000000000004', 4)
    source.durationSteps = 7
    const collision = note('10000000-0000-4000-8000-000000000001', 0)
    const varied = note('20000000-0000-4000-8000-000000000005', 5)
    varied.durationSteps = 8
    const merged = mergeWorkRangeVariation([source, collision], [source], [varied], { startStep: 4, endStep: 8 })
    expect(merged).toHaveLength(3)
    expect(merged).toContainEqual(collision)
    expect(merged).toContainEqual({ ...varied, durationSteps: 3 })
    const tail = merged.find(({ step }) => step === 8)!
    expect(tail).toMatchObject({ pitch: source.pitch, midi: source.midi, step: 8, durationSteps: 3 })
    expect(AppNoteSchema.parse(tail)).toEqual(tail)
  })

  it('preserves and validates a fractional source tail shorter than one quarter step', () => {
    const crossing = note('70000000-0000-4000-8000-000000000001', 31)
    crossing.durationSteps = 1.1
    const { source } = notesInWorkRange([crossing], { startStep: 16, endStep: 32 })
    expect(source[0].durationSteps).toBe(1)
    const varied = { ...source[0], pitch: 'D4', midi: 62 }
    const merged = mergeWorkRangeVariation([crossing], source, [varied], { startStep: 16, endStep: 32 })
    const tail = merged.find(({ step }) => step === 32)
    expect(tail?.durationSteps).toBeCloseTo(0.1)
    expect(AppNoteSchema.parse(tail)).toEqual(tail)
  })

  it('drops varied notes whose onset is outside the work range or whose duration is invalid', () => {
    const source = note('80000000-0000-4000-8000-000000000001', 4)
    const outside = note('80000000-0000-4000-8000-000000000002', 8)
    const zeroDuration = note('80000000-0000-4000-8000-000000000003', 5)
    zeroDuration.durationSteps = 0
    const merged = mergeWorkRangeVariation([source], [source], [outside, zeroDuration], { startStep: 4, endStep: 8 })
    expect(merged).toEqual([])
  })

  it('replaces a range while preserving left and right fragments with valid ids', () => {
    const crossing = note('30000000-0000-4000-8000-000000000001', 2)
    crossing.durationSteps = 10
    const replacement = note('40000000-0000-4000-8000-000000000001', 5)
    replacement.durationSteps = 8
    const result = replaceNotesInWorkRange([crossing], [replacement], { startStep: 4, endStep: 8 })
    expect(result.map(({ step, durationSteps }) => ({ step, durationSteps }))).toEqual([
      { step: 2, durationSteps: 2 },
      { step: 5, durationSteps: 3 },
      { step: 8, durationSteps: 4 }
    ])
    for (const fragment of result) expect(AppNoteSchema.parse(fragment)).toEqual(fragment)
  })

  it('splits a note spanning the full range and clips negative-start overlap at zero', () => {
    const full = note('50000000-0000-4000-8000-000000000001', 0)
    full.durationSteps = 12
    const replacement = note('60000000-0000-4000-8000-000000000001', 4)
    const result = replaceNotesInWorkRange([full], [replacement], { startStep: 4, endStep: 8 })
    expect(result.map(({ step, durationSteps }) => ({ step, durationSteps }))).toEqual([
      { step: 0, durationSteps: 4 },
      { step: 4, durationSteps: 1 },
      { step: 8, durationSteps: 4 }
    ])
  })
})
