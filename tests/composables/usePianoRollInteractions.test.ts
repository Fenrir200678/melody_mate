import { describe, expect, it, vi } from 'vitest'
import type { AppNote } from '@/core/schemas/note.schema'
import {
  calculatePanScroll,
  computeAxisLock,
  computeLassoBounds,
  createNote,
  cloneNotes,
  deleteNotes,
  detectZone,
  getNoteAtPixel,
  isNoteInLasso,
  moveNotes,
  resizeNotes,
  resolveKeyboardKeyTooltip,
  updateNoteVelocity
} from '@/composables/pianoroll/noteOps'
import { stepToPixelX, midiToPixelY } from '@/composables/pianoroll/geometry'

describe('usePianoRollInteractions – Smart Tools & Editing Engine', () => {
  const transformOptions = {
    stepWidth: 24,
    rowHeight: 18,
    scrollX: 0,
    scrollY: 0,
    keyboardWidth: 56,
    maxMidi: 84 // C6
  }

  const sampleNote: AppNote = {
    id: 'note-1',
    pitch: 'C4',
    midi: 60,
    step: 4,
    durationSteps: 4, // 4 * 24 = 96px width
    velocity: 100,
    isMuted: false
  }

  describe('Hit-Testing & Edge Detection (detectZone & getNoteAtPixel)', () => {
    it('should detect "body" when pointing in the middle of a note', () => {
      // Note starts at step 4: x = 56 + 4 * 24 = 152px. Width = 96 - 1 = 95px.
      // Note Y for C4 (60): (84 - 60) * 18 = 432px. Height = 16px.
      const noteX = stepToPixelX(sampleNote.step, transformOptions.stepWidth, 0, transformOptions.keyboardWidth)
      const noteY = midiToPixelY(sampleNote.midi, transformOptions.rowHeight, 0, transformOptions.maxMidi)

      // Test point in middle: noteX + 20, noteY + 8
      const zone = detectZone(noteX + 20, noteY + 8, sampleNote, transformOptions)
      expect(zone).toBe('body')
    })

    it('should detect "resize-end" when cursor is in the last 8px of the note', () => {
      const noteX = stepToPixelX(sampleNote.step, transformOptions.stepWidth, 0, transformOptions.keyboardWidth)
      const noteW = sampleNote.durationSteps * transformOptions.stepWidth - 1 // 95px
      const noteY = midiToPixelY(sampleNote.midi, transformOptions.rowHeight, 0, transformOptions.maxMidi)

      // 4px from the right edge
      const zone = detectZone(noteX + noteW - 4, noteY + 8, sampleNote, transformOptions)
      expect(zone).toBe('resize-end')

      // Exactly at the 8px boundary
      const boundaryZone = detectZone(noteX + noteW - 8, noteY + 8, sampleNote, transformOptions)
      expect(boundaryZone).toBe('resize-end')
    })

    it('should detect "outside" when cursor is outside the note bounding box', () => {
      const noteX = stepToPixelX(sampleNote.step, transformOptions.stepWidth, 0, transformOptions.keyboardWidth)
      const noteY = midiToPixelY(sampleNote.midi, transformOptions.rowHeight, 0, transformOptions.maxMidi)

      // Left of note
      expect(detectZone(noteX - 1, noteY + 8, sampleNote, transformOptions)).toBe('outside')
      // Right of note
      expect(detectZone(noteX + 100, noteY + 8, sampleNote, transformOptions)).toBe('outside')
      // Above note
      expect(detectZone(noteX + 20, noteY - 2, sampleNote, transformOptions)).toBe('outside')
      // Below note
      expect(detectZone(noteX + 20, noteY + 20, sampleNote, transformOptions)).toBe('outside')
    })

    it('should find the topmost note with getNoteAtPixel', () => {
      const note2: AppNote = {
        id: 'note-2',
        pitch: 'D4',
        midi: 62,
        step: 4,
        durationSteps: 2,
        velocity: 90,
        isMuted: false
      }

      const notes = [sampleNote, note2]
      const note2X = stepToPixelX(note2.step, transformOptions.stepWidth, 0, transformOptions.keyboardWidth)
      const note2Y = midiToPixelY(note2.midi, transformOptions.rowHeight, 0, transformOptions.maxMidi)

      const hit = getNoteAtPixel(note2X + 10, note2Y + 8, notes, transformOptions)
      expect(hit.note?.id).toBe('note-2')
      expect(hit.zone).toBe('body')

      // Empty location
      const emptyHit = getNoteAtPixel(1000, 1000, notes, transformOptions)
      expect(emptyHit.note).toBeNull()
      expect(emptyHit.zone).toBe('outside')
    })
  })

  describe('Note Creation (createNote)', () => {
    it('should instantiate a valid AppNote with generated UUID and correct pitch', () => {
      const note = createNote(8, 60, 2, 95)
      expect(note.id).toBeDefined()
      expect(note.pitch).toBe('C4')
      expect(note.midi).toBe(60)
      expect(note.step).toBe(8)
      expect(note.durationSteps).toBe(2)
      expect(note.velocity).toBe(95)
      expect(note.isMuted).toBe(false)
    })

    it('should clamp step to >= 0 and velocity to [1, 127]', () => {
      const note = createNote(-5, 130, 0.5, 200)
      expect(note.step).toBe(0)
      expect(note.midi).toBe(127)
      expect(note.durationSteps).toBe(1) // minimum 1 step
      expect(note.velocity).toBe(127)
    })
  })

  describe('Note Resizing & Minimum-Length Guard (resizeNotes)', () => {
    it('should lengthen notes by delta duration', () => {
      const notes = [sampleNote]
      const resized = resizeNotes(notes, ['note-1'], 2, 1)
      expect(resized[0].durationSteps).toBe(6)
    })

    it('should shorten notes but enforce minimum length guard', () => {
      const notes = [sampleNote] // durationSteps is 4
      // Shorten by 3 -> duration 1
      const shortened1 = resizeNotes(notes, ['note-1'], -3, 1)
      expect(shortened1[0].durationSteps).toBe(1)

      // Shorten by 10 -> clamped to minimum duration (1)
      const shortened2 = resizeNotes(notes, ['note-1'], -10, 1)
      expect(shortened2[0].durationSteps).toBe(1)

      // Minimum duration with 1/8 snap (2 steps)
      const shortenedSnap = resizeNotes(notes, ['note-1'], -10, 2)
      expect(shortenedSnap[0].durationSteps).toBe(2)
    })

    it('should clamp resize duration so note does not exceed maxStep', () => {
      const notes = [sampleNote] // step 4, duration 4
      // Expanding by 20 with maxStep 16 -> step 4 + duration (4 + 20 = 24) exceeds 16 -> clamped to duration 12
      const resized = resizeNotes(notes, ['note-1'], 20, 1, 16)
      expect(resized[0].durationSteps).toBe(12)
      expect(resized[0].step + resized[0].durationSteps).toBe(16)
    })
  })

  describe('Note Moving & Bounds Checking (moveNotes)', () => {
    it('should translate step and midi, updating pitch string', () => {
      const notes = [sampleNote] // C4 (60) at step 4
      const moved = moveNotes(notes, ['note-1'], 2, 4) // step + 2 -> 6, midi + 4 -> 64 (E4)
      expect(moved[0].step).toBe(6)
      expect(moved[0].midi).toBe(64)
      expect(moved[0].pitch).toBe('E4')
    })

    it('should clamp movement so no note can move before step 0', () => {
      const notes = [sampleNote] // step 4
      // Try to move back 10 steps
      const moved = moveNotes(notes, ['note-1'], -10, 0)
      expect(moved[0].step).toBe(0)
    })

    it('should clamp movement so no note exceeds maxStep', () => {
      const notes = [sampleNote] // step 4, duration 4 (ends at step 8)
      // If maxStep is 16, moving by 20 should clamp so step + duration <= 16 (step clamped to 12)
      const moved = moveNotes(notes, ['note-1'], 20, 0, { maxStep: 16 })
      expect(moved[0].step).toBe(12)
      expect(moved[0].step + moved[0].durationSteps).toBe(16)
    })

    it('should clamp MIDI transposition within minMidi/maxMidi boundaries', () => {
      const notes = [sampleNote] // midi 60
      // Move up by 30 with maxMidi 84 -> 60 + 30 = 90, clamped to 84
      const movedUp = moveNotes(notes, ['note-1'], 0, 30, { minMidi: 36, maxMidi: 84 })
      expect(movedUp[0].midi).toBe(84)
      expect(movedUp[0].pitch).toBe('C6')

      // Move down by 40 with minMidi 36 -> 60 - 40 = 20, clamped to 36
      const movedDown = moveNotes(notes, ['note-1'], 0, -40, { minMidi: 36, maxMidi: 84 })
      expect(movedDown[0].midi).toBe(36)
      expect(movedDown[0].pitch).toBe('C2')
    })
  })

  describe('Note Cloning (cloneNotes - Alt + Drag)', () => {
    it('should preserve original notes and append shifted copies with fresh IDs', () => {
      const notes = [sampleNote]
      const { newNotes, clonedIds } = cloneNotes(notes, ['note-1'], 4, 2)

      expect(newNotes).toHaveLength(2)
      expect(clonedIds).toHaveLength(1)

      // Original note unchanged
      expect(newNotes[0].id).toBe('note-1')
      expect(newNotes[0].step).toBe(4)
      expect(newNotes[0].midi).toBe(60)

      // Cloned note shifted with distinct ID
      expect(newNotes[1].id).not.toBe('note-1')
      expect(newNotes[1].step).toBe(8)
      expect(newNotes[1].midi).toBe(62)
      expect(newNotes[1].pitch).toBe('D4')
    })
  })

  describe('Note Deletion (deleteNotes)', () => {
    it('should remove target notes by ID and retain others', () => {
      const note2: AppNote = { ...sampleNote, id: 'note-2', step: 8 }
      const notes = [sampleNote, note2]

      const remaining = deleteNotes(notes, ['note-1'])
      expect(remaining).toHaveLength(1)
      expect(remaining[0].id).toBe('note-2')
    })
  })

  describe('Lasso Selection & Marquee Bounds (isNoteInLasso & computeLassoBounds)', () => {
    it('should detect when a note overlaps the marquee in time and pitch', () => {
      // sampleNote: step 4..8, midi 60
      const lassoMatching = {
        startStep: 2,
        endStep: 6,
        minMidi: 58,
        maxMidi: 62
      }
      expect(isNoteInLasso(sampleNote, lassoMatching)).toBe(true)

      // Outside in time (after)
      const lassoPast = {
        startStep: 10,
        endStep: 16,
        minMidi: 58,
        maxMidi: 62
      }
      expect(isNoteInLasso(sampleNote, lassoPast)).toBe(false)

      // Outside in pitch (higher)
      const lassoAbove = {
        startStep: 2,
        endStep: 6,
        minMidi: 65,
        maxMidi: 70
      }
      expect(isNoteInLasso(sampleNote, lassoAbove)).toBe(false)
    })

    it('should compute valid step and MIDI bounds from drag pixel coordinates', () => {
      // Drag from pixel (100, 200) to (250, 400)
      const { bounds, rect } = computeLassoBounds(100, 200, 250, 400, transformOptions)

      expect(rect.x).toBe(100)
      expect(rect.y).toBe(200)
      expect(rect.width).toBe(150)
      expect(rect.height).toBe(200)

      expect(bounds.startStep).toBeLessThan(bounds.endStep)
      expect(bounds.minMidi).toBeLessThanOrEqual(bounds.maxMidi)
    })
  })

  describe('Velocity Adjustments (updateNoteVelocity)', () => {
    it('should update the velocity of target note clamped to [1, 127]', () => {
      const notes = [sampleNote]
      const updated = updateNoteVelocity(notes, 'note-1', 115)
      expect(updated[0].velocity).toBe(115)

      const clampedHigh = updateNoteVelocity(notes, 'note-1', 200)
      expect(clampedHigh[0].velocity).toBe(127)

      const clampedLow = updateNoteVelocity(notes, 'note-1', -10)
      expect(clampedLow[0].velocity).toBe(1)
    })
  })

  describe('Axis Lock Computation (computeAxisLock - Shift + Drag)', () => {
    it('should lock to horizontal when deltaX is greater or equal to deltaY', () => {
      expect(computeAxisLock(20, 5)).toBe('horizontal')
      expect(computeAxisLock(-30, 25)).toBe('horizontal')
      expect(computeAxisLock(10, 10)).toBe('horizontal')
    })

    it('should lock to vertical when deltaY is greater than deltaX', () => {
      expect(computeAxisLock(5, 20)).toBe('vertical')
      expect(computeAxisLock(15, -40)).toBe('vertical')
    })
  })

  describe('Auditioning Behavior', () => {
    it('should invoke callback only when audition is enabled', () => {
      const auditionMock = vi.fn()

      // When audition is enabled
      const triggerAudition = (pitch: string, isEnabled: boolean) => {
        if (isEnabled) auditionMock(pitch)
      }

      triggerAudition('C4', true)
      expect(auditionMock).toHaveBeenCalledWith('C4')

      auditionMock.mockClear()

      // When audition is disabled
      triggerAudition('E4', false)
      expect(auditionMock).not.toHaveBeenCalled()
    })
  })

  describe('Pan Scroll Calculation (calculatePanScroll)', () => {
    it('translates positive client drag into decreased scroll and negative drag into increased scroll', () => {
      // Dragging mouse to the left (deltaClientX = -50) means timeline moves right (scrollX increases)
      const res1 = calculatePanScroll(100, 100, -50, -30, 500, 500)
      expect(res1.scrollX).toBe(150)
      expect(res1.scrollY).toBe(130)

      // Dragging mouse to the right (deltaClientX = +40) means timeline moves left (scrollX decreases)
      const res2 = calculatePanScroll(100, 100, 40, 20, 500, 500)
      expect(res2.scrollX).toBe(60)
      expect(res2.scrollY).toBe(80)
    })

    it('strictly clamps scrollX and scrollY within [0, maxScroll]', () => {
      // Clamps to 0 when dragged past start
      const clampLow = calculatePanScroll(50, 50, 100, 100, 500, 500)
      expect(clampLow.scrollX).toBe(0)
      expect(clampLow.scrollY).toBe(0)

      // Clamps to maxScroll when dragged past end
      const clampHigh = calculatePanScroll(450, 450, -100, -100, 500, 500)
      expect(clampHigh.scrollX).toBe(500)
      expect(clampHigh.scrollY).toBe(500)
    })

    it('handles zero or negative maxScroll bounds gracefully', () => {
      const res = calculatePanScroll(0, 0, -200, -200, 0, 0)
      expect(res.scrollX).toBe(0)
      expect(res.scrollY).toBe(0)
    })
  })

  describe('Keyboard Tooltip Hover Resolution (resolveKeyboardKeyTooltip)', () => {
    const keyTransform = {
      rowHeight: 18,
      scrollY: 0,
      minMidi: 24, // C1
      maxMidi: 84 // C6
    }

    it('resolves key note with root annotation for root pitch', () => {
      // midi 65 is F4. Y: (84 - 65) * 18 = 342.
      const tooltip = resolveKeyboardKeyTooltip(342, keyTransform, 'F', 'minor')
      expect(tooltip).toBe('F4 (Root)')
    })

    it('resolves natural notes without root annotation', () => {
      // midi 60 is C4. Y: (84 - 60) * 18 = 432.
      const tooltip = resolveKeyboardKeyTooltip(432, keyTransform, 'F', 'minor')
      expect(tooltip).toBe('C4')
    })

    it('resolves scale-adapted accidental notes', () => {
      // midi 70 is Bb4 (diatonic in F minor). Y: (84 - 70) * 18 = 252.
      const tooltip = resolveKeyboardKeyTooltip(252, keyTransform, 'F', 'minor')
      expect(tooltip).toBe('Bb4 / A#4')
    })

    it('returns null when pointer is outside minMidi / maxMidi range', () => {
      // Above maxMidi (Y < 0 corresponds to midi > 84)
      const above = resolveKeyboardKeyTooltip(-20, keyTransform, 'C', 'major')
      expect(above).toBeNull()

      // Below minMidi (Y corresponding to midi < 24)
      // (84 - 23) * 18 = 61 * 18 = 1098.
      const below = resolveKeyboardKeyTooltip(1100, keyTransform, 'C', 'major')
      expect(below).toBeNull()
    })
  })
})
