import { describe, expect, it } from 'vitest'
import type { ChordEvent } from '../../../src/core/schemas/chord.schema'
import { calculateResizedDuration } from '../../../src/core/theory/chord-resize'

const chord: ChordEvent = {
  id: 'source',
  name: 'C',
  roman: 'I',
  notes: ['C', 'E', 'G'],
  voicing: ['C3', 'E3', 'G3'],
  startBar: 1,
  durationBars: 1
}
const options = { totalBars: 8, snapGrid: 0.25, minDuration: 0.25 }

describe('chord edge resize geometry', () => {
  it('snaps to quarter bars and clamps to the minimum and track end', () => {
    expect(calculateResizedDuration(chord, [chord], 0.38, options)).toBe(1.5)
    expect(calculateResizedDuration(chord, [chord], -10, options)).toBe(0.25)
    expect(calculateResizedDuration(chord, [chord], 20, options)).toBe(7)
  })

  it('finds the nearest following chord regardless of array order without changing its position', () => {
    const next = { ...chord, id: 'next', startBar: 3 }
    const later = { ...chord, id: 'later', startBar: 6 }
    const before = { ...chord, id: 'before', startBar: 0 }
    const chords = [later, chord, next, before]
    expect(calculateResizedDuration(chord, chords, 10, options)).toBe(2)
    expect(next.startBar).toBe(3)
    expect(chord.durationBars).toBe(1)
  })

  it('rounds a fractional neighbour limit down rather than creating an overlap', () => {
    const next = { ...chord, id: 'next', startBar: 2.125 }
    expect(calculateResizedDuration(chord, [chord, next], 10, options)).toBe(1)
  })

  it('keeps short imported chords intact when there is no room for the minimum resize duration', () => {
    const short = { ...chord, durationBars: 0.125 }
    const next = { ...chord, id: 'next', startBar: 1.125 }
    expect(calculateResizedDuration(short, [short, next], 1, options)).toBe(short.durationBars)
  })
})
