import { describe, expect, it } from 'vitest'
import {
  adjustNotesDuration,
  adjustNotesVelocity,
  findNextNoteId,
  findPreviousNoteId,
  nudgeNotesTime,
  sortNotesChronologically,
  toggleNotesMute,
  transposeNotesPitch
} from '../../../src/core/pianoroll/note-editing'
import type { AppNote } from '../../../src/core/schemas/note.schema'

function createTestNote(overrides: Partial<AppNote> = {}): AppNote {
  const midi = overrides.midi ?? 60
  return {
    id: overrides.id ?? crypto.randomUUID(),
    pitch: overrides.pitch ?? `C4`,
    midi,
    step: overrides.step ?? 0,
    durationSteps: overrides.durationSteps ?? 2,
    velocity: overrides.velocity ?? 100,
    isMuted: overrides.isMuted ?? false
  }
}

describe('note-editing core', () => {
  describe('sortNotesChronologically', () => {
    it('sorts notes by step first, then midi pitch, then stable ID', () => {
      const n1 = createTestNote({ id: 'n1', step: 4, midi: 60 })
      const n2 = createTestNote({ id: 'n2', step: 0, midi: 64 })
      const n3 = createTestNote({ id: 'n3', step: 0, midi: 60 })
      const n4 = createTestNote({ id: 'n4', step: 0, midi: 67 })

      const sorted = sortNotesChronologically([n1, n2, n3, n4])
      expect(sorted.map((n) => n.id)).toEqual(['n3', 'n2', 'n4', 'n1'])
    })
  })

  describe('findNextNoteId & findPreviousNoteId', () => {
    it('returns null when notes array is empty', () => {
      expect(findNextNoteId([], null)).toBeNull()
      expect(findPreviousNoteId([], null)).toBeNull()
    })

    it('returns first note on next and last note on previous when current selection is null', () => {
      const n1 = createTestNote({ id: 'n1', step: 0 })
      const n2 = createTestNote({ id: 'n2', step: 4 })
      const n3 = createTestNote({ id: 'n3', step: 8 })
      const notes = [n2, n3, n1]

      expect(findNextNoteId(notes, null)).toBe('n1')
      expect(findPreviousNoteId(notes, null)).toBe('n3')
    })

    it('navigates forward chronologically across steps and chords', () => {
      const c4 = createTestNote({ id: 'c4', step: 0, midi: 60 })
      const e4 = createTestNote({ id: 'e4', step: 0, midi: 64 })
      const g4 = createTestNote({ id: 'g4', step: 0, midi: 67 })
      const d4 = createTestNote({ id: 'd4', step: 4, midi: 62 })
      const notes = [d4, g4, c4, e4]

      expect(findNextNoteId(notes, 'c4')).toBe('e4')
      expect(findNextNoteId(notes, 'e4')).toBe('g4')
      expect(findNextNoteId(notes, 'g4')).toBe('d4')
    })

    it('clamps to the last note when already at the end', () => {
      const n1 = createTestNote({ id: 'n1', step: 0 })
      const n2 = createTestNote({ id: 'n2', step: 4 })
      const notes = [n1, n2]

      expect(findNextNoteId(notes, 'n2')).toBe('n2')
    })

    it('navigates backward chronologically across steps and chords', () => {
      const c4 = createTestNote({ id: 'c4', step: 0, midi: 60 })
      const e4 = createTestNote({ id: 'e4', step: 0, midi: 64 })
      const d4 = createTestNote({ id: 'd4', step: 4, midi: 62 })
      const notes = [c4, e4, d4]

      expect(findPreviousNoteId(notes, 'd4')).toBe('e4')
      expect(findPreviousNoteId(notes, 'e4')).toBe('c4')
    })

    it('clamps to the first note when already at the start', () => {
      const n1 = createTestNote({ id: 'n1', step: 0 })
      const n2 = createTestNote({ id: 'n2', step: 4 })
      const notes = [n1, n2]

      expect(findPreviousNoteId(notes, 'n1')).toBe('n1')
    })

    it('falls back gracefully when selected ID is not found in the array', () => {
      const n1 = createTestNote({ id: 'n1', step: 0 })
      const n2 = createTestNote({ id: 'n2', step: 4 })
      const notes = [n1, n2]

      expect(findNextNoteId(notes, 'nonexistent')).toBe('n1')
      expect(findPreviousNoteId(notes, 'nonexistent')).toBe('n2')
    })
  })

  describe('nudgeNotesTime', () => {
    it('returns original notes if empty selection or delta is zero', () => {
      const n1 = createTestNote({ id: 'n1', step: 2 })
      expect(nudgeNotesTime([n1], [], 2)).toEqual([n1])
      expect(nudgeNotesTime([n1], ['n1'], 0)).toEqual([n1])
    })

    it('nudges selected notes right by deltaSteps', () => {
      const n1 = createTestNote({ id: 'n1', step: 2 })
      const n2 = createTestNote({ id: 'n2', step: 6 })
      const unselected = createTestNote({ id: 'u1', step: 10 })

      const result = nudgeNotesTime([n1, n2, unselected], ['n1', 'n2'], 2)
      expect(result.find((n) => n.id === 'n1')?.step).toBe(4)
      expect(result.find((n) => n.id === 'n2')?.step).toBe(8)
      expect(result.find((n) => n.id === 'u1')?.step).toBe(10)
    })

    it('nudges selected notes left by deltaSteps', () => {
      const n1 = createTestNote({ id: 'n1', step: 4 })
      const n2 = createTestNote({ id: 'n2', step: 8 })

      const result = nudgeNotesTime([n1, n2], ['n1', 'n2'], -2)
      expect(result.find((n) => n.id === 'n1')?.step).toBe(2)
      expect(result.find((n) => n.id === 'n2')?.step).toBe(6)
    })

    it('clamps to step 0 preserving relative distance between notes', () => {
      const n1 = createTestNote({ id: 'n1', step: 1 })
      const n2 = createTestNote({ id: 'n2', step: 5 })

      // Attempting to move left by 4, but n1 can only move left by 1 (to step 0)
      const result = nudgeNotesTime([n1, n2], ['n1', 'n2'], -4)
      expect(result.find((n) => n.id === 'n1')?.step).toBe(0)
      expect(result.find((n) => n.id === 'n2')?.step).toBe(4)
    })

    it('clamps to maxSteps preserving relative distance between notes', () => {
      const n1 = createTestNote({ id: 'n1', step: 58, durationSteps: 2 })
      const n2 = createTestNote({ id: 'n2', step: 62, durationSteps: 2 }) // ends at 64

      // Attempting to move right by 4 with maxSteps = 64
      const result = nudgeNotesTime([n1, n2], ['n1', 'n2'], 4, 64)
      expect(result.find((n) => n.id === 'n1')?.step).toBe(58)
      expect(result.find((n) => n.id === 'n2')?.step).toBe(62)
    })
  })

  describe('adjustNotesDuration', () => {
    it('returns original notes if empty selection or delta is zero', () => {
      const n1 = createTestNote({ id: 'n1', durationSteps: 2 })
      expect(adjustNotesDuration([n1], [], 1)).toEqual([n1])
      expect(adjustNotesDuration([n1], ['n1'], 0)).toEqual([n1])
    })

    it('increases duration of selected notes', () => {
      const n1 = createTestNote({ id: 'n1', durationSteps: 2 })
      const n2 = createTestNote({ id: 'n2', durationSteps: 4 })
      const unselected = createTestNote({ id: 'u1', durationSteps: 2 })

      const result = adjustNotesDuration([n1, n2, unselected], ['n1', 'n2'], 2)
      expect(result.find((n) => n.id === 'n1')?.durationSteps).toBe(4)
      expect(result.find((n) => n.id === 'n2')?.durationSteps).toBe(6)
      expect(result.find((n) => n.id === 'u1')?.durationSteps).toBe(2)
    })

    it('decreases duration with a strict minimum of 1 step', () => {
      const n1 = createTestNote({ id: 'n1', durationSteps: 2 })
      const n2 = createTestNote({ id: 'n2', durationSteps: 1 })

      const result = adjustNotesDuration([n1, n2], ['n1', 'n2'], -2)
      expect(result.find((n) => n.id === 'n1')?.durationSteps).toBe(1)
      expect(result.find((n) => n.id === 'n2')?.durationSteps).toBe(1)
    })
  })

  describe('adjustNotesVelocity', () => {
    it('returns original notes if empty selection or delta is zero', () => {
      const n1 = createTestNote({ id: 'n1', velocity: 100 })
      expect(adjustNotesVelocity([n1], [], 5)).toEqual([n1])
      expect(adjustNotesVelocity([n1], ['n1'], 0)).toEqual([n1])
    })

    it('adjusts velocity by delta (+5 / -5)', () => {
      const n1 = createTestNote({ id: 'n1', velocity: 90 })
      const n2 = createTestNote({ id: 'n2', velocity: 110 })
      const unselected = createTestNote({ id: 'u1', velocity: 80 })

      const plus5 = adjustNotesVelocity([n1, n2, unselected], ['n1', 'n2'], 5)
      expect(plus5.find((n) => n.id === 'n1')?.velocity).toBe(95)
      expect(plus5.find((n) => n.id === 'n2')?.velocity).toBe(115)
      expect(plus5.find((n) => n.id === 'u1')?.velocity).toBe(80)

      const minus5 = adjustNotesVelocity([n1, n2, unselected], ['n1', 'n2'], -5)
      expect(minus5.find((n) => n.id === 'n1')?.velocity).toBe(85)
      expect(minus5.find((n) => n.id === 'n2')?.velocity).toBe(105)
      expect(minus5.find((n) => n.id === 'u1')?.velocity).toBe(80)
    })

    it('clamps velocity strictly between 1 and 127', () => {
      const n1 = createTestNote({ id: 'n1', velocity: 125 })
      const n2 = createTestNote({ id: 'n2', velocity: 3 })

      const maxClamped = adjustNotesVelocity([n1], ['n1'], 10)
      expect(maxClamped.find((n) => n.id === 'n1')?.velocity).toBe(127)

      const minClamped = adjustNotesVelocity([n2], ['n2'], -10)
      expect(minClamped.find((n) => n.id === 'n2')?.velocity).toBe(1)
    })
  })

  describe('toggleNotesMute', () => {
    it('returns original notes if empty selection', () => {
      const n1 = createTestNote({ id: 'n1', isMuted: false })
      expect(toggleNotesMute([n1], [])).toEqual([n1])
    })

    it('mutes unmuted notes', () => {
      const n1 = createTestNote({ id: 'n1', isMuted: false })
      const n2 = createTestNote({ id: 'n2', isMuted: false })
      const unselected = createTestNote({ id: 'u1', isMuted: false })

      const result = toggleNotesMute([n1, n2, unselected], ['n1', 'n2'])
      expect(result.find((n) => n.id === 'n1')?.isMuted).toBe(true)
      expect(result.find((n) => n.id === 'n2')?.isMuted).toBe(true)
      expect(result.find((n) => n.id === 'u1')?.isMuted).toBe(false)
    })

    it('unmutes all notes if all selected notes are already muted', () => {
      const n1 = createTestNote({ id: 'n1', isMuted: true })
      const n2 = createTestNote({ id: 'n2', isMuted: true })

      const result = toggleNotesMute([n1, n2], ['n1', 'n2'])
      expect(result.find((n) => n.id === 'n1')?.isMuted).toBe(false)
      expect(result.find((n) => n.id === 'n2')?.isMuted).toBe(false)
    })

    it('mutes all selected notes if selection contains a mix of muted and unmuted (Ableton style)', () => {
      const n1 = createTestNote({ id: 'n1', isMuted: true })
      const n2 = createTestNote({ id: 'n2', isMuted: false })

      const result = toggleNotesMute([n1, n2], ['n1', 'n2'])
      expect(result.find((n) => n.id === 'n1')?.isMuted).toBe(true)
      expect(result.find((n) => n.id === 'n2')?.isMuted).toBe(true)
    })
  })

  describe('transposeNotesPitch', () => {
    it('returns original notes if empty selection or delta is zero', () => {
      const n1 = createTestNote({ id: 'n1', midi: 60 })
      expect(transposeNotesPitch([n1], [], 1)).toEqual([n1])
      expect(transposeNotesPitch([n1], ['n1'], 0)).toEqual([n1])
      expect(transposeNotesPitch([], ['n1'], 1)).toEqual([])
    })

    it('transposes selected notes chromatically when scale lock is off or omitted', () => {
      const n1 = createTestNote({ id: 'n1', midi: 60, pitch: 'C4' })
      const n2 = createTestNote({ id: 'n2', midi: 64, pitch: 'E4' })
      const unselected = createTestNote({ id: 'u1', midi: 67, pitch: 'G4' })

      const transposedUp = transposeNotesPitch([n1, n2, unselected], ['n1', 'n2'], 1)
      expect(transposedUp.find((n) => n.id === 'n1')).toMatchObject({ midi: 61, pitch: 'Db4' })
      expect(transposedUp.find((n) => n.id === 'n2')).toMatchObject({ midi: 65, pitch: 'F4' })
      expect(transposedUp.find((n) => n.id === 'u1')).toMatchObject({ midi: 67, pitch: 'G4' })

      const transposedDown = transposeNotesPitch([n1, n2, unselected], ['n1', 'n2'], -1)
      expect(transposedDown.find((n) => n.id === 'n1')).toMatchObject({ midi: 59, pitch: 'B3' })
      expect(transposedDown.find((n) => n.id === 'n2')).toMatchObject({ midi: 63, pitch: 'Eb4' })
    })

    it('transposes selected notes diatonically when isScaleLocked is true', () => {
      const c4 = createTestNote({ id: 'c4', midi: 60, pitch: 'C4' })
      const e4 = createTestNote({ id: 'e4', midi: 64, pitch: 'E4' })

      // In C Major: C4 (60) + 1 step -> D4 (62); E4 (64) + 1 step -> F4 (65)
      const up = transposeNotesPitch([c4, e4], ['c4', 'e4'], 1, {
        isScaleLocked: true,
        rootKey: 'C',
        scale: 'major'
      })
      expect(up.find((n) => n.id === 'c4')).toMatchObject({ midi: 62, pitch: 'D4' })
      expect(up.find((n) => n.id === 'e4')).toMatchObject({ midi: 65, pitch: 'F4' })

      // In C Major: C4 (60) - 1 step -> B3 (59); F4 (65) - 1 step -> E4 (64)
      const down = transposeNotesPitch([c4, createTestNote({ id: 'f4', midi: 65, pitch: 'F4' })], ['c4', 'f4'], -1, {
        isScaleLocked: true,
        rootKey: 'C',
        scale: 'major'
      })
      expect(down.find((n) => n.id === 'c4')).toMatchObject({ midi: 59, pitch: 'B3' })
      expect(down.find((n) => n.id === 'f4')).toMatchObject({ midi: 64, pitch: 'E4' })
    })

    it('steps to nearest scale degree when transposing an accidental note with scale lock on', () => {
      // C#4 (61) is outside C major
      const csharp = createTestNote({ id: 'cs4', midi: 61, pitch: 'C#4' })

      const up = transposeNotesPitch([csharp], ['cs4'], 1, {
        isScaleLocked: true,
        rootKey: 'C',
        scale: 'major'
      })
      expect(up.find((n) => n.id === 'cs4')).toMatchObject({ midi: 62, pitch: 'D4' })

      const down = transposeNotesPitch([csharp], ['cs4'], -1, {
        isScaleLocked: true,
        rootKey: 'C',
        scale: 'major'
      })
      expect(down.find((n) => n.id === 'cs4')).toMatchObject({ midi: 60, pitch: 'C4' })
    })

    it('transposes octaves directly by ±12 semitones even when scale lock is on', () => {
      const c4 = createTestNote({ id: 'c4', midi: 60, pitch: 'C4' })
      const eb4 = createTestNote({ id: 'eb4', midi: 63, pitch: 'D#4' }) // intentional accidental in C major

      const upOctave = transposeNotesPitch([c4, eb4], ['c4', 'eb4'], 12, {
        isScaleLocked: true,
        rootKey: 'C',
        scale: 'major'
      })
      expect(upOctave.find((n) => n.id === 'c4')).toMatchObject({ midi: 72, pitch: 'C5' })
      expect(upOctave.find((n) => n.id === 'eb4')).toMatchObject({ midi: 75, pitch: 'Eb5' })

      const downOctave = transposeNotesPitch([c4], ['c4'], -12, {
        isScaleLocked: true,
        rootKey: 'C',
        scale: 'major'
      })
      expect(downOctave.find((n) => n.id === 'c4')).toMatchObject({ midi: 48, pitch: 'C3' })
    })

    it('clamps pitch strictly within [0, 127] or custom bounds', () => {
      const highNote = createTestNote({ id: 'high', midi: 127 })
      const lowNote = createTestNote({ id: 'low', midi: 0 })

      const upClamped = transposeNotesPitch([highNote], ['high'], 1, {
        isScaleLocked: false
      })
      expect(upClamped.find((n) => n.id === 'high')?.midi).toBe(127)

      const downClamped = transposeNotesPitch([lowNote], ['low'], -1, {
        isScaleLocked: false
      })
      expect(downClamped.find((n) => n.id === 'low')?.midi).toBe(0)
    })
  })
})
