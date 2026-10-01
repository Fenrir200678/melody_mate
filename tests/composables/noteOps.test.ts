import { replaceNotesInWorkRange } from '@/core/generator/work-range'
import { describe, expect, it } from 'vitest'
import type { AppNote } from '../../src/core/schemas/note.schema'
import {
  addNoteToList,
  createNote,
  deleteNotes,
  duplicateNotes,
  moveNotes,
  resizeNotes,
  sortNotes,
  updateNoteInList,
  updateNoteVelocity
} from '../../src/composables/pianoroll/noteOps'

function makeNote(id: string, step: number, midi: number, durationSteps = 2, velocity = 100): AppNote {
  return {
    id,
    pitch: `N${midi}`,
    midi,
    step,
    durationSteps,
    velocity,
    isMuted: false
  }
}

describe('noteOps', () => {
  describe('sortNotes', () => {
    it('sorts notes primarily by step ascending and secondarily by midi ascending', () => {
      const n1 = makeNote('n1', 4, 60)
      const n2 = makeNote('n2', 0, 64)
      const n3 = makeNote('n3', 0, 60)
      const n4 = makeNote('n4', 2, 70)

      const sorted = sortNotes([n1, n2, n3, n4])
      expect(sorted.map((n) => n.id)).toEqual(['n3', 'n2', 'n4', 'n1'])
    })

    it('returns a new array without mutating input', () => {
      const original = [makeNote('n1', 2, 60), makeNote('n2', 0, 60)]
      const copy = [...original]
      const sorted = sortNotes(original)

      expect(original).toEqual(copy)
      expect(sorted).not.toBe(original)
    })
  })

  describe('addNoteToList', () => {
    it('inserts a note in chronological and pitch sorted order', () => {
      const n1 = makeNote('n1', 0, 60)
      const n2 = makeNote('n2', 4, 64)
      const inserted = makeNote('n3', 2, 62)

      const result = addNoteToList([n1, n2], inserted)
      expect(result.map((n) => n.id)).toEqual(['n1', 'n3', 'n2'])
    })
  })

  describe('updateNoteInList', () => {
    it('updates specified note fields while maintaining sorted order', () => {
      const n1 = makeNote('n1', 0, 60)
      const n2 = makeNote('n2', 4, 64)

      // Move n1 to step 6 (should end up after n2)
      const result = updateNoteInList([n1, n2], 'n1', { step: 6 })
      expect(result.map((n) => n.id)).toEqual(['n2', 'n1'])
      expect(result.find((n) => n.id === 'n1')?.step).toBe(6)
    })

    it('returns a copy of array if id not found', () => {
      const n1 = makeNote('n1', 0, 60)
      const result = updateNoteInList([n1], 'unknown', { velocity: 80 })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('n1')
    })
  })

  describe('deleteNotes', () => {
    it('removes notes with target IDs', () => {
      const n1 = makeNote('n1', 0, 60)
      const n2 = makeNote('n2', 2, 62)
      const n3 = makeNote('n3', 4, 64)

      const result = deleteNotes([n1, n2, n3], ['n1', 'n3'])
      expect(result.map((n) => n.id)).toEqual(['n2'])
    })

    it('returns copy when target IDs array is empty', () => {
      const n1 = makeNote('n1', 0, 60)
      const result = deleteNotes([n1], [])
      expect(result).toHaveLength(1)
    })
  })

  describe('duplicateNotes', () => {
    it('duplicates notes shifted by snapped time span', () => {
      const n1 = makeNote('n1', 0, 60, 2) // span: 0..2
      const n2 = makeNote('n2', 2, 64, 2) // span: 2..4 -> total span = 4 steps
      const notes = [n1, n2]

      const { newNotes, clonedIds } = duplicateNotes(notes, ['n1', 'n2'], 1)
      expect(clonedIds).toHaveLength(2)
      expect(newNotes).toHaveLength(4)

      const clones = newNotes.filter((n) => clonedIds.includes(n.id))
      expect(clones[0].step).toBe(4) // 0 + 4
      expect(clones[1].step).toBe(6) // 2 + 4
      expect(clones[0].midi).toBe(60)
      expect(clones[1].midi).toBe(64)
    })

    it('snaps delta step to provided snap grid', () => {
      const n1 = makeNote('n1', 0, 60, 3) // span: 0..3 (span = 3 steps)
      // Snap grid of 4 -> ceil(3 / 4) * 4 = 4
      const { newNotes, clonedIds } = duplicateNotes([n1], ['n1'], 4)
      const clone = newNotes.find((n) => clonedIds.includes(n.id))
      expect(clone?.step).toBe(4)
    })

    it('respects maxStep boundary when provided', () => {
      const n1 = makeNote('n1', 28, 60, 4) // step 28..32
      const { newNotes, clonedIds } = duplicateNotes([n1], ['n1'], 4, 32)
      const clone = newNotes.find((n) => clonedIds.includes(n.id))
      // Cannot exceed maxStep = 32, so step + duration cannot go past 32
      expect(clone?.step).toBeLessThanOrEqual(28)
    })

    it('returns unchanged list if targetIds is empty or contains no existing notes', () => {
      const n1 = makeNote('n1', 0, 60)
      expect(duplicateNotes([n1], [], 1).clonedIds).toEqual([])
      expect(duplicateNotes([n1], ['non-existent'], 1).clonedIds).toEqual([])
    })
  })

  describe('createNote, moveNotes, resizeNotes, updateNoteVelocity', () => {
    it('creates note with clamped values', () => {
      const note = createNote(1.5, 60.2, 2.3, 105.7)
      expect(note.step).toBe(1.5)
      expect(note.midi).toBe(60)
      expect(note.pitch).toBe('C4')
      expect(note.durationSteps).toBe(2.3)
      expect(note.velocity).toBe(106)
    })

    it('moves notes with pitch and step clamping', () => {
      const n1 = makeNote('n1', 0, 126, 2)
      const moved = moveNotes([n1], ['n1'], -5, 10, { minMidi: 0, maxMidi: 127 })
      // Negative step movement clamped to 0
      expect(moved[0].step).toBe(0)
      // Upward MIDI clamped to 127
      expect(moved[0].midi).toBe(127)
    })

    it('resizes notes enforcing minDuration', () => {
      const n1 = makeNote('n1', 0, 60, 4)
      const resized = resizeNotes([n1], ['n1'], -10, 1)
      expect(resized[0].durationSteps).toBe(1)
    })

    it('updates note velocity clamped to 1-127', () => {
      const n1 = makeNote('n1', 0, 60, 4, 80)
      const updated = updateNoteVelocity([n1], 'n1', 200)
      expect(updated[0].velocity).toBe(127)
    })
  })

  describe('replaceNotesInWorkRange', () => {
    it('preserves notes outside the range and replaces notes within the range', () => {
      // Existing: note before (0..4), note inside (16..20), note after (32..36)
      const before = makeNote('before', 0, 60, 4)
      const inside = makeNote('inside', 16, 62, 4)
      const after = makeNote('after', 32, 64, 4)
      const existing = [before, inside, after]

      // New notes generated for range [16, 32)
      const new1 = makeNote('new1', 16, 72, 2)
      const new2 = makeNote('new2', 20, 74, 2)

      const merged = replaceNotesInWorkRange(existing, [new1, new2], { startStep: 16, endStep: 32 })

      expect(merged.map((n) => n.id)).toEqual(['before', 'new1', 'new2', 'after'])
      expect(merged.find((n) => n.id === 'inside')).toBeUndefined()
    })

    it('truncates notes that straddle the start boundary into the range', () => {
      // Note starts at 12 and extends to 18 (crosses start boundary 16)
      const straddling = makeNote('straddling', 12, 60, 6)
      const existing = [straddling]

      const newNote = makeNote('new', 16, 72, 4)
      const merged = replaceNotesInWorkRange(existing, [newNote], { startStep: 16, endStep: 32 })

      expect(merged).toHaveLength(2)
      const truncated = merged.find((n) => n.id === 'straddling')
      expect(truncated).toBeDefined()
      expect(truncated?.step).toBe(12)
      expect(truncated?.durationSteps).toBe(4) // 16 - 12 = 4 steps
    })

    it('preserves the tail of notes starting inside and extending past the end', () => {
      // Note starts at 28 and extends to 36 (crosses end boundary 32)
      const startsInside = makeNote('inside-cross', 28, 60, 8)
      const existing = [startsInside]

      const newNote = makeNote('new', 16, 72, 4)
      const merged = replaceNotesInWorkRange(existing, [newNote], { startStep: 16, endStep: 32 })

      expect(merged).toHaveLength(2)
      expect(merged[0].id).toBe('new')
      expect(merged[1]).toMatchObject({ step: 32, durationSteps: 4, midi: 60 })
    })

    it('handles empty existing notes or empty new notes cleanly', () => {
      const newNote = makeNote('new', 16, 72, 4)
      expect(replaceNotesInWorkRange([], [newNote], { startStep: 16, endStep: 32 })).toEqual([newNote])

      const existing = [makeNote('n1', 0, 60, 4)]
      expect(replaceNotesInWorkRange(existing, [], { startStep: 16, endStep: 32 })).toEqual(existing)
    })
  })
})
