import { describe, expect, it } from 'vitest'
import type { ChordEvent } from '@/core/schemas/chord.schema'
import {
  blockDensity,
  calculateBlockGeometry,
  calculateFitBarWidth,
  calculateProgressionBars,
  calculateTrackBars,
  calculateZoomPercentage,
  DEFAULT_BAR_WIDTH,
  duplicateProgression,
  formatBarSpan,
  MAX_BAR_WIDTH,
  MIN_BAR_WIDTH,
  progressionEndBar
} from '@/composables/harmony/timelineOps'

function makeChord(overrides: Partial<ChordEvent> = {}): ChordEvent {
  return {
    id: 'c-1',
    name: 'C',
    roman: 'I',
    notes: ['C', 'E', 'G'],
    voicing: ['C4', 'E4', 'G4'],
    startBar: 0,
    durationBars: 1,
    ...overrides
  }
}

describe('timelineOps', () => {
  describe('calculateFitBarWidth', () => {
    it('divides the container across the bars when the result is inside the readable range', () => {
      expect(calculateFitBarWidth(1000, 4)).toBe(250)
    })

    it('clamps to the minimum when the progression is longer than the viewport', () => {
      expect(calculateFitBarWidth(100, 4)).toBe(MIN_BAR_WIDTH)
    })

    it('clamps to the maximum when only a few bars are shown', () => {
      expect(calculateFitBarWidth(10000, 4)).toBe(MAX_BAR_WIDTH)
    })

    it('falls back to the default before the container was measured', () => {
      expect(calculateFitBarWidth(0, 4)).toBe(DEFAULT_BAR_WIDTH)
      expect(calculateFitBarWidth(1000, 0)).toBe(DEFAULT_BAR_WIDTH)
    })
  })

  describe('calculateZoomPercentage', () => {
    it('reports 100% at the fitted base width', () => {
      expect(calculateZoomPercentage(250, 250)).toBe(100)
    })

    it('reports the ratio against the base width', () => {
      expect(calculateZoomPercentage(300, 200)).toBe(150)
    })
  })

  describe('progressionEndBar', () => {
    it('is zero for an empty progression', () => {
      expect(progressionEndBar([])).toBe(0)
    })

    it('includes fractional durations of the last chord', () => {
      expect(progressionEndBar([makeChord({ startBar: 2, durationBars: 1.5 })])).toBe(3.5)
    })
  })

  describe('calculateTrackBars', () => {
    it('uses the project length while the progression is empty', () => {
      expect(calculateTrackBars(4, [])).toBe(4)
    })

    it('never reports fewer than one bar', () => {
      expect(calculateTrackBars(0, [])).toBe(1)
    })

    it('adds one spare bar for the ghost slot once chords exist', () => {
      expect(calculateTrackBars(2, [makeChord({ durationBars: 4 })])).toBe(5)
    })

    it('keeps the project length when the progression is shorter', () => {
      expect(calculateTrackBars(8, [makeChord()])).toBe(8)
    })
  })

  describe('calculateProgressionBars', () => {
    it('returns the project length for an empty progression', () => {
      expect(calculateProgressionBars(4, [])).toBe(4)
    })

    it('grows to the rounded progression end', () => {
      expect(calculateProgressionBars(2, [makeChord({ durationBars: 4 })])).toBe(4)
    })

    it('does not shrink a longer project', () => {
      expect(calculateProgressionBars(8, [makeChord({ durationBars: 2 })])).toBe(8)
    })
  })

  describe('formatBarSpan', () => {
    it('labels a single bar without a range', () => {
      expect(formatBarSpan(makeChord({ startBar: 0, durationBars: 1 }))).toBe('Bar 1')
    })

    it('labels whole-bar ranges inclusively and one-based', () => {
      expect(formatBarSpan(makeChord({ startBar: 0, durationBars: 2 }))).toBe('Bars 1–2')
      expect(formatBarSpan(makeChord({ startBar: 2, durationBars: 4 }))).toBe('Bars 3–6')
    })

    it('annotates fractional durations instead of faking a range', () => {
      expect(formatBarSpan(makeChord({ startBar: 1, durationBars: 0.5 }))).toBe('Bar 2 (0.5b)')
    })
  })

  describe('calculateBlockGeometry', () => {
    it('insets the block by one pixel on both sides', () => {
      expect(calculateBlockGeometry(2, 1, 220)).toEqual({ left: 441, width: 218 })
    })

    it('never collapses below the 16px selection floor', () => {
      expect(calculateBlockGeometry(0, 0.25, 20).width).toBe(16)
    })
  })

  describe('blockDensity', () => {
    it('switches to wide at 100px and to compact below 55px', () => {
      expect(blockDensity(100)).toBe('wide')
      expect(blockDensity(99.9)).toBe('medium')
      expect(blockDensity(55)).toBe('medium')
      expect(blockDensity(54)).toBe('compact')
    })
  })

  describe('duplicateProgression', () => {
    it('returns an empty array for an empty progression', () => {
      expect(duplicateProgression([])).toEqual([])
    })

    it('appends a clone offset by the progression length with fresh ids', () => {
      const original = [
        makeChord({ id: 'a', startBar: 0, durationBars: 1 }),
        makeChord({ id: 'b', startBar: 1, durationBars: 2 })
      ]

      const doubled = duplicateProgression(original)

      expect(doubled).toHaveLength(4)
      expect(doubled.map((c) => c.startBar)).toEqual([0, 1, 3, 4])
      expect(new Set(doubled.map((c) => c.id)).size).toBe(4)
      expect(doubled.slice(0, 2)).toEqual(original)
    })
  })
})
