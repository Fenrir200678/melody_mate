import { describe, expect, it } from 'vitest'
import { getActiveChordNotes } from '../../../src/core/generator/chord.lookup'
import type { ChordEvent } from '../../../src/core/schemas/chord.schema'

const chords: ChordEvent[] = [
  {
    id: 'first',
    name: 'C',
    roman: 'I',
    notes: ['C', 'E', 'G'],
    voicing: ['C3', 'E3', 'G3'],
    startBar: 0,
    durationBars: 0.5
  },
  {
    id: 'second',
    name: 'G7',
    roman: 'V7',
    notes: ['G', 'B', 'D', 'F'],
    voicing: ['G3', 'B3', 'D4', 'F4'],
    startBar: 0.5,
    durationBars: 0.25
  },
  {
    id: 'third',
    name: 'Am7',
    roman: 'vi7',
    notes: ['A', 'C', 'E', 'G'],
    voicing: ['A3', 'C4', 'E4', 'G4'],
    startBar: 0.75,
    durationBars: 0.25
  }
]

describe('getActiveChordNotes', () => {
  it('follows chord changes inside the same bar at sequencer-step precision', () => {
    expect(getActiveChordNotes(0, 16, chords)).toEqual(chords[0].notes)
    expect(getActiveChordNotes(7, 16, chords)).toEqual(chords[0].notes)
    expect(getActiveChordNotes(8, 16, chords)).toEqual(chords[1].notes)
    expect(getActiveChordNotes(11, 16, chords)).toEqual(chords[1].notes)
    expect(getActiveChordNotes(12, 16, chords)).toEqual(chords[2].notes)
    expect(getActiveChordNotes(16, 16, chords, 'C')).toEqual(['C'])
  })
})
