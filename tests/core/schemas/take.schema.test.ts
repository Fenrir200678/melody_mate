import { describe, expect, it } from 'vitest'
import { TakeSnapshotSchema } from '../../../src/core/schemas/take.schema'
import { DEFAULT_GENERATOR_PARAMS } from '../../../src/config/defaults'

const snapshot = {
  id: 'take-1',
  seed: 42,
  createdAt: 1000,
  notes: [],
  params: {},
  context: { key: 'C', scale: 'major', bpm: 120, bars: 4 }
}

describe('TakeSnapshotSchema', () => {
  it('fills capture defaults and generator defaults', () => {
    const take = TakeSnapshotSchema.parse(snapshot)
    expect(take.locked).toBe(false)
    expect(take.score).toBeNull()
    expect(take.params.motif).toBe(DEFAULT_GENERATOR_PARAMS.motif)
  })

  it.each([0, 0xffffffff])('accepts uint32 seed %i', (seed) => {
    expect(TakeSnapshotSchema.parse({ ...snapshot, seed }).seed).toBe(seed)
  })

  it.each([-1, 0x100000000, 1.5, Infinity])('rejects invalid seed %s', (seed) => {
    expect(TakeSnapshotSchema.safeParse({ ...snapshot, seed }).success).toBe(false)
  })

  it('validates nested notes, params, context, timestamps, and scores', () => {
    for (const patch of [
      { notes: [{ midi: 200 }] },
      { params: { minOctave: 7, maxOctave: 2 } },
      { context: { ...snapshot.context, bars: 0 } },
      { context: { ...snapshot.context, bpm: -1 } },
      { createdAt: -1 },
      { score: Infinity },
      { id: '' }
    ]) {
      expect(TakeSnapshotSchema.safeParse({ ...snapshot, ...patch }).success).toBe(false)
    }
    expect(TakeSnapshotSchema.parse({ ...snapshot, score: 72 }).score).toBe(72)
  })
})
