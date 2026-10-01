import { describe, expect, it } from 'vitest'
import type { AppNote } from '../../src/core/schemas/note.schema'
import {
  computeVelocityFromY,
  findVelocityNoteAtX,
  VELOCITY_PADDING_BOTTOM,
  VELOCITY_PADDING_TOP
} from '../../src/composables/pianoroll/velocityRenderLayers'

function makeNote(id: string, step: number, velocity = 100): AppNote {
  return {
    id,
    pitch: 'C4',
    midi: 60,
    step,
    durationSteps: 2,
    velocity,
    isMuted: false
  }
}

describe('velocityRenderLayers', () => {
  describe('computeVelocityFromY', () => {
    it('computes maximum velocity (127) when at or above the top padding boundary', () => {
      const height = 100
      // Usable height: 100 - 14 - 10 = 76. Top of stem: 14.
      const velTop = computeVelocityFromY(14, height)
      expect(velTop).toBe(127)

      const velAbove = computeVelocityFromY(0, height)
      expect(velAbove).toBe(127)
    })

    it('computes minimum velocity (1) when at or below the bottom padding boundary', () => {
      const height = 100
      // Bottom of stem: 100 - 10 = 90.
      const velBottom = computeVelocityFromY(90, height)
      expect(velBottom).toBe(1)

      const velBelow = computeVelocityFromY(110, height)
      expect(velBelow).toBe(1)
    })

    it('computes mid-range velocity proportionally', () => {
      const height = 100
      const usableH = height - VELOCITY_PADDING_TOP - VELOCITY_PADDING_BOTTOM // 76
      const stemBottomY = height - VELOCITY_PADDING_BOTTOM // 90
      const midY = stemBottomY - usableH / 2 // 52
      const vel = computeVelocityFromY(midY, height)
      expect(vel).toBe(64)
    })
  })

  describe('findVelocityNoteAtX', () => {
    it('finds note closest to the pointer X coordinate within threshold', () => {
      const n1 = makeNote('n1', 0) // step 0 -> pixel 56 + 0*24 + 3 = 59
      const n2 = makeNote('n2', 4) // step 4 -> pixel 56 + 4*24 + 3 = 155
      const notes = [n1, n2]

      // stepWidth = 24, scrollX = 0, keyboardWidth = 56
      const found = findVelocityNoteAtX(notes, 60, 24, 0, 56)
      expect(found?.id).toBe('n1')

      const found2 = findVelocityNoteAtX(notes, 154, 24, 0, 56)
      expect(found2?.id).toBe('n2')
    })

    it('returns null when no note is within threshold', () => {
      const n1 = makeNote('n1', 0)
      const notes = [n1]

      // n1 is at x = 59. threshold is max(8, 24 * 0.6) = 14.4. Point 100 is far away.
      const found = findVelocityNoteAtX(notes, 100, 24, 0, 56)
      expect(found).toBeNull()
    })
  })
})
