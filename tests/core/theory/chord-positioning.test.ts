import { describe, expect, it } from 'vitest'
import type { ChordEvent } from '../../../src/core/schemas/chord.schema'
import {
  calculateMovedStartBar,
  cloneChordToPosition,
  repositionChord,
  snapBarToGrid
} from '../../../src/core/theory/chord-positioning'

function chord(id: string, startBar: number, durationBars = 1): ChordEvent {
  return {
    id,
    name: 'C',
    roman: 'I',
    notes: ['C', 'E', 'G'],
    voicing: ['E3', 'G3', 'C4'],
    startBar,
    durationBars,
    inversion: 1
  }
}

describe('chord positioning', () => {
  it('snaps to fractional and whole bar grids and clamps bounds', () => {
    expect(snapBarToGrid(1.13, 0.25)).toBe(1.25)
    expect(snapBarToGrid(1.24, 0.5)).toBe(1)
    expect(snapBarToGrid(1.6, 1)).toBe(2)
    expect(snapBarToGrid(-0.2, 0.25, 0, 4)).toBe(0)
    expect(snapBarToGrid(4.8, 0.25, 0, 4)).toBe(4)
  })

  it('converts pixel deltas to bars and clamps against both timeline edges', () => {
    const options = { totalBars: 8, snapGrid: 0.5 }
    expect(calculateMovedStartBar(2, 50, 100, 1, options)).toBe(2.5)
    expect(calculateMovedStartBar(1, -500, 100, 1, options)).toBe(0)
    expect(calculateMovedStartBar(6, 500, 100, 1, options)).toBe(7)
  })

  it('moves a late chord into a gap and trims the preceding chord', () => {
    const source = [chord('first', 0, 1), chord('middle', 1, 1), chord('last', 4, 1)]
    const result = repositionChord(source, 'last', 0.5)

    expect(result.map(({ id, startBar, durationBars }) => ({ id, startBar, durationBars }))).toEqual([
      { id: 'first', startBar: 0, durationBars: 0.5 },
      { id: 'last', startBar: 0.5, durationBars: 0.5 },
      { id: 'middle', startBar: 1, durationBars: 1 }
    ])
    expect(source[0].durationBars).toBe(1)
  })

  it('fills a half-bar gap without shifting or resizing adjacent chords', () => {
    const source = [chord('first', 0, 0.5), chord('middle', 1), chord('last', 4, 0.5)]
    const result = repositionChord(source, 'last', 0.5)
    expect(result).toEqual([source[0], { ...source[2], startBar: 0.5 }, source[1]])
    expect(source[2].startBar).toBe(4)
  })

  it('gives the moved chord priority when it lands at an occupied start', () => {
    const result = repositionChord([chord('first', 0), chord('moved', 2)], 'moved', 0)
    expect(result.map((item) => item.id)).toEqual(['moved'])
  })

  it('clones identity, voicing, inversion, and independent note arrays', () => {
    const source = chord('source', 0)
    const result = cloneChordToPosition([source], 'source', 2, 'copy')
    const copy = result.find((item) => item.id === 'copy')!

    expect(copy).toMatchObject({ startBar: 2, name: 'C', roman: 'I', inversion: 1 })
    expect(copy.notes).toEqual(source.notes)
    expect(copy.voicing).toEqual(source.voicing)
    expect(copy.notes).not.toBe(source.notes)
    expect(copy.voicing).not.toBe(source.voicing)
    copy.notes.push('B')
    copy.voicing.push('B3')
    expect(source.notes).toEqual(['C', 'E', 'G'])
    expect(source.voicing).toEqual(['E3', 'G3', 'C4'])
  })

  it('gives a clone priority at an occupied position and leaves inputs unchanged', () => {
    const original = [chord('occupied', 2), chord('source', 0)]
    const result = cloneChordToPosition(original, 'source', 2, 'copy')
    expect(result.map((item) => item.id)).toEqual(['source', 'copy'])
    expect(original.map((item) => item.id)).toEqual(['occupied', 'source'])
    expect(cloneChordToPosition(original, 'missing', 3, 'copy')).toEqual(original)
    expect(repositionChord(original, 'missing', 3)).toEqual(original)
  })
})
