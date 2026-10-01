import { describe, expect, it } from 'vitest'
import { ChordEventSchema, type ChordEvent } from '../../../src/core/schemas/chord.schema'
import { fitAndMergeProgression } from '../../../src/core/theory/progression-range'

const chord = (id: string, startBar: number, durationBars: number): ChordEvent => ({
  id,
  name: 'C',
  roman: 'I',
  notes: ['C', 'E', 'G'],
  voicing: ['C3', 'E3', 'G3'],
  startBar,
  durationBars,
  inversion: 0
})

describe('fitAndMergeProgression', () => {
  it('positions relative chords in a nonzero work range and clips at its end', () => {
    const result = fitAndMergeProgression(
      [],
      [chord('00000000-0000-4000-8000-000000000001', 0, 1), chord('00000000-0000-4000-8000-000000000002', 1, 1)],
      { startStep: 32, endStep: 56 }
    )
    expect(result.map(({ startBar, durationBars }) => ({ startBar, durationBars }))).toEqual([
      { startBar: 2, durationBars: 1 },
      { startBar: 3, durationBars: 0.5 }
    ])
  })

  it('preserves chords outside the range and splits a crossing chord on both sides', () => {
    const existing = [
      chord('00000000-0000-4000-8000-000000000001', 0, 1),
      chord('00000000-0000-4000-8000-000000000002', 1, 3),
      chord('00000000-0000-4000-8000-000000000003', 4, 1)
    ]
    const result = fitAndMergeProgression(existing, [chord('10000000-0000-4000-8000-000000000001', 0, 1)], {
      startStep: 32,
      endStep: 48
    })
    expect(result.map(({ id, startBar, durationBars }) => ({ id, startBar, durationBars }))).toEqual([
      { id: '00000000-0000-4000-8000-000000000001', startBar: 0, durationBars: 1 },
      { id: '00000000-0000-4000-8000-000000000002', startBar: 1, durationBars: 1 },
      { id: '10000000-0000-4000-8000-000000000001', startBar: 2, durationBars: 1 },
      { id: expect.stringMatching(/^[0-9a-f]{8}-0000-4000-8000-[0-9a-f]{12}$/), startBar: 3, durationBars: 1 },
      { id: '00000000-0000-4000-8000-000000000003', startBar: 4, durationBars: 1 }
    ])
    const fragment = result.find(({ startBar }) => startBar === 3)!
    expect(ChordEventSchema.parse(fragment)).toEqual(fragment)
  })

  it('avoids generated fragment id collisions', () => {
    const originalId = '20000000-0000-4000-8000-000000000001'
    const result = fitAndMergeProgression(
      [chord(originalId, 1, 3), chord('20000000-0000-4000-8000-000000000002', 9, 1)],
      [],
      { startStep: 32, endStep: 48 }
    )
    const fragment = result.find(({ startBar }) => startBar === 3)!
    expect(fragment.id).not.toBe(originalId)
    expect(fragment.id).toMatch(/^[0-9a-f]{8}-0000-4000-8000-[0-9a-f]{12}$/)
    expect(ChordEventSchema.parse(fragment)).toEqual(fragment)
  })
})
