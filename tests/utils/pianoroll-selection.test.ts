import { describe, expect, it } from 'vitest'
import { getFullySelectedBars } from '@/utils/pianoroll-selection'
import type { AppNote } from '@/core/schemas/note.schema'

function createNote(id: string, step: number): AppNote {
  return {
    id,
    pitch: 'C4',
    midi: 60,
    step,
    durationSteps: 1,
    velocity: 100,
    isMuted: false
  }
}

describe('getFullySelectedBars', () => {
  it('identifies bars where all notes are selected', () => {
    // Bar 0: step 0 and 4 (16 steps/bar)
    // Bar 1: step 16
    const notes = [createNote('n1', 0), createNote('n2', 4), createNote('n3', 16)]

    // When only n1 and n2 are selected, bar 0 is fully selected, bar 1 is not
    const result = getFullySelectedBars(notes, ['n1', 'n2'])
    expect(result.has(0)).toBe(true)
    expect(result.has(1)).toBe(false)
  })

  it('excludes partially selected bars', () => {
    const notes = [createNote('n1', 0), createNote('n2', 4)]
    const result = getFullySelectedBars(notes, ['n1'])
    expect(result.size).toBe(0)
  })

  it('returns empty set when notes or selection is empty', () => {
    expect(getFullySelectedBars([], []).size).toBe(0)
    expect(getFullySelectedBars([createNote('n1', 0)], []).size).toBe(0)
  })
})
