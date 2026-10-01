import { describe, expect, it } from 'vitest'
import {
  calculateContentPitchBounds,
  calculateFitLoop,
  calculateHorizontalZoom,
  calculateSmartPitchFit,
  calculateVerticalZoom,
  DEFAULT_ROW_HEIGHT
} from '@/composables/pianoroll/zoomOps'

describe('zoomOps', () => {
  describe('calculateContentPitchBounds', () => {
    it('returns null when notes and chords are empty', () => {
      expect(calculateContentPitchBounds([])).toBeNull()
      expect(calculateContentPitchBounds([], [])).toBeNull()
    })

    it('extracts min and max MIDI from notes', () => {
      const notes = [{ midi: 60 }, { midi: 64 }, { midi: 72 }]
      const bounds = calculateContentPitchBounds(notes)
      expect(bounds).toEqual({ minMidi: 60, maxMidi: 72 })
    })

    it('combines notes and chord voicings', () => {
      const notes = [{ midi: 60 }]
      const chords = [{ voicing: ['C2', 'G4'] }] // C2 = 36, G4 = 67
      const bounds = calculateContentPitchBounds(notes, chords)
      expect(bounds).toEqual({ minMidi: 36, maxMidi: 67 })
    })
  })

  describe('calculateVerticalZoom', () => {
    it('zooms in when deltaY is negative', () => {
      const result = calculateVerticalZoom({
        deltaY: -100,
        oldRowHeight: 18,
        mouseY: 200,
        scrollY: 100,
        maxMidi: 108,
        minMidi: 24,
        viewportHeight: 600
      })
      expect(result.newRowHeight).toBeGreaterThan(18)
    })

    it('zooms out when deltaY is positive', () => {
      const result = calculateVerticalZoom({
        deltaY: 100,
        oldRowHeight: 18,
        mouseY: 200,
        scrollY: 100,
        maxMidi: 108,
        minMidi: 24,
        viewportHeight: 600
      })
      expect(result.newRowHeight).toBeLessThan(18)
    })
  })

  describe('calculateHorizontalZoom', () => {
    it('zooms in when deltaY is negative', () => {
      const result = calculateHorizontalZoom({
        deltaY: -100,
        oldStepWidth: 24,
        mouseX: 300,
        scrollX: 50,
        keyboardWidth: 56,
        viewportWidth: 800,
        bars: 4
      })
      expect(result.newStepWidth).toBeGreaterThan(24)
    })
  })

  describe('calculateSmartPitchFit', () => {
    it('fits existing melody notes with comfortable height instead of squashing', () => {
      const notes = [{ midi: 60 }, { midi: 67 }] // C4 to G4 (8 semitones)
      const result = calculateSmartPitchFit({
        viewportHeight: 600,
        notes,
        minMidi: 24,
        maxMidi: 108,
        currentRowHeight: DEFAULT_ROW_HEIGHT
      })

      // Instead of 8px (blind 85 notes fit), it should provide comfortable note row height
      expect(result.rowHeight).toBeGreaterThanOrEqual(25)
      expect(result.isToggledToDefault).toBe(false)
    })

    it('toggles back to default height when already fitted or compressed', () => {
      const notes = [{ midi: 60 }, { midi: 67 }]
      const result = calculateSmartPitchFit({
        viewportHeight: 600,
        notes,
        minMidi: 24,
        maxMidi: 108,
        currentRowHeight: 35, // Already fitted
        defaultRowHeight: DEFAULT_ROW_HEIGHT
      })

      expect(result.rowHeight).toBe(DEFAULT_ROW_HEIGHT)
      expect(result.isToggledToDefault).toBe(true)
    })
  })

  describe('calculateFitLoop', () => {
    it('fits loop region cleanly into viewport width', () => {
      const result = calculateFitLoop({
        viewportWidth: 800,
        keyboardWidth: 56,
        loopStartStep: 0,
        loopEndStep: 32,
        bars: 4
      })
      expect(result.stepWidth).toBe(Math.floor((800 - 56) / 32))
    })
  })
})
