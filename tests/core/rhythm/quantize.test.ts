import { describe, expect, it } from 'vitest'
import { quantizeNotes } from '../../../src/core/rhythm/quantize'
import type { AppNote } from '../../../src/core/schemas/note.schema'

function createSampleNote(step: number, midi = 60, durationSteps = 4, id?: string): AppNote {
  return {
    id: id ?? crypto.randomUUID(),
    pitch: `C${Math.floor(midi / 12) - 1}`,
    midi,
    step,
    durationSteps,
    velocity: 100,
    isMuted: false
  }
}

describe('quantizeNotes', () => {
  it('returns empty array when given empty notes list', () => {
    expect(quantizeNotes([], 1)).toEqual([])
  })

  it('snaps notes to grid 1 (16th notes)', () => {
    const notes = [createSampleNote(0.2, 60), createSampleNote(1.7, 62), createSampleNote(2.4, 64)]
    const quantized = quantizeNotes(notes, 1)

    expect(quantized[0].step).toBe(0)
    expect(quantized[1].step).toBe(2)
    expect(quantized[2].step).toBe(2)
  })

  it('snaps notes to grid 2 (8th notes)', () => {
    const notes = [
      createSampleNote(0.4, 60),
      createSampleNote(1.2, 62),
      createSampleNote(2.8, 64),
      createSampleNote(5.1, 65)
    ]
    const quantized = quantizeNotes(notes, 2)

    expect(quantized[0].step).toBe(0)
    expect(quantized[1].step).toBe(2)
    expect(quantized[2].step).toBe(2)
    expect(quantized[3].step).toBe(6)
  })

  it('snaps notes to grid 4 (quarter notes)', () => {
    const notes = [
      createSampleNote(1.5, 60), // 1.5/4 = 0.375 -> round = 0
      createSampleNote(2.6, 62), // 2.6/4 = 0.65 -> round = 1 -> 4
      createSampleNote(7.8, 64) // 7.8/4 = 1.95 -> round = 2 -> 8
    ]
    const quantized = quantizeNotes(notes, 4)

    expect(quantized[0].step).toBe(0)
    expect(quantized[1].step).toBe(4)
    expect(quantized[2].step).toBe(8)
  })

  it('clamps negative steps to step 0', () => {
    const notes = [createSampleNote(-2, 60), createSampleNote(-0.4, 62)]
    const quantized = quantizeNotes(notes, 1)

    expect(quantized[0].step).toBe(0)
    expect(quantized[1].step).toBe(0)
  })

  it('shortens note duration to prevent overlap on the same pitch', () => {
    // Note 1 starts at 0 with duration 4 (ends at 4)
    // Note 2 starts at 2.9 (snaps with grid 2 to 2) with duration 4
    const note1 = createSampleNote(0, 60, 4, 'note-1')
    const note2 = createSampleNote(2.9, 60, 4, 'note-2')

    const quantized = quantizeNotes([note1, note2], 2)

    expect(quantized).toHaveLength(2)
    expect(quantized[0].id).toBe('note-1')
    expect(quantized[0].step).toBe(0)
    // Duration must be truncated to 2 so it doesn't overlap Note 2 at step 2
    expect(quantized[0].durationSteps).toBe(2)

    expect(quantized[1].id).toBe('note-2')
    expect(quantized[1].step).toBe(2) // 2.9 snapped to 2 (grid 2: 2.9/2=1.45->1*2=2)
    expect(quantized[1].durationSteps).toBe(4)
  })

  it('deduplicates notes that snap to the exact same step on the same pitch', () => {
    const noteA = createSampleNote(0.8, 60, 2, 'note-a')
    const noteB = createSampleNote(1.2, 60, 4, 'note-b')

    // Both snap to step 1 (grid 1) on pitch 60; noteB has longer duration
    const quantized = quantizeNotes([noteA, noteB], 1)

    expect(quantized).toHaveLength(1)
    expect(quantized[0].id).toBe('note-b')
    expect(quantized[0].step).toBe(1)
    expect(quantized[0].durationSteps).toBe(4)
  })

  it('preserves polyphonic notes on different pitches at the same step', () => {
    const noteC = createSampleNote(0.2, 60, 4, 'c4')
    const noteE = createSampleNote(0.1, 64, 4, 'e4')
    const noteG = createSampleNote(0.3, 67, 4, 'g4')

    const quantized = quantizeNotes([noteC, noteE, noteG], 1)

    expect(quantized).toHaveLength(3)
    quantized.forEach((n) => {
      expect(n.step).toBe(0)
      expect(n.durationSteps).toBe(4)
    })
  })

  it('sorts output notes chronologically, then by ascending pitch', () => {
    const note1 = createSampleNote(4, 67)
    const note2 = createSampleNote(0, 64)
    const note3 = createSampleNote(0, 60)

    const quantized = quantizeNotes([note1, note2, note3], 1)

    expect(quantized[0].step).toBe(0)
    expect(quantized[0].midi).toBe(60)
    expect(quantized[1].step).toBe(0)
    expect(quantized[1].midi).toBe(64)
    expect(quantized[2].step).toBe(4)
    expect(quantized[2].midi).toBe(67)
  })
})
