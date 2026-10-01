import { describe, expect, it, vi } from 'vitest'
import {
  calculateMaxScrollX,
  followNextStep,
  type FollowStepState,
  getViewportBounds,
  isNoteInViewport,
  midiToPixelY,
  pixelXToStep,
  pixelYToMidi,
  setupCanvasDpi,
  snapStepToGrid,
  stepToPixelX
} from '@/composables/pianoroll/geometry'

describe('usePianoRollCanvas – Mathematical Logic & Coordinate Mapping', () => {
  const keyboardWidth = 56
  const stepWidth = 24
  const rowHeight = 18
  const maxMidi = 84 // C6

  describe('stepToPixelX & pixelXToStep (Time / X-Axis Transformation)', () => {
    it('should map step 0 to keyboardWidth when scrollX is 0', () => {
      const x = stepToPixelX(0, stepWidth, 0, keyboardWidth)
      expect(x).toBe(keyboardWidth)
    })

    it('should map step accurately with positive scrollX', () => {
      // step 4 with stepWidth 24 is 96px from keyboard edge
      // with scrollX 40, x should be 56 + 96 - 40 = 112
      const x = stepToPixelX(4, stepWidth, 40, keyboardWidth)
      expect(x).toBe(112)
    })

    it('should accurately round-trip from step to pixel and back to step without snapping', () => {
      const testSteps = [0, 1, 3.5, 7.25, 16, 32.125]
      const scrollX = 64

      for (const step of testSteps) {
        const x = stepToPixelX(step, stepWidth, scrollX, keyboardWidth)
        const reconstructedStep = pixelXToStep(x, stepWidth, scrollX, keyboardWidth, 0)
        expect(reconstructedStep).toBeCloseTo(step, 4)
      }
    })

    it('should clamp pixelXToStep to 0 when pixel is within keyboard area', () => {
      const step = pixelXToStep(10, stepWidth, 0, keyboardWidth, 0)
      expect(step).toBe(0)
    })
  })

  describe('midiToPixelY & pixelYToMidi (Pitch / Y-Axis Transformation)', () => {
    it('should map maxMidi (C6=84) to y=0 when scrollY is 0', () => {
      const y = midiToPixelY(maxMidi, rowHeight, 0, maxMidi)
      expect(y).toBe(0)
    })

    it('should map middle C (C4=60) correctly based on rowHeight', () => {
      // 84 - 60 = 24 semitone rows down
      const expectedY = 24 * rowHeight
      const y = midiToPixelY(60, rowHeight, 0, maxMidi)
      expect(y).toBe(expectedY)
    })

    it('should correctly account for scrollY offset', () => {
      const scrollY = 100
      const y = midiToPixelY(60, rowHeight, scrollY, maxMidi)
      expect(y).toBe(24 * rowHeight - scrollY)
    })

    it('should accurately map any pixel Y inside a row back to the exact MIDI note', () => {
      const scrollY = 72
      const testMidis = [36, 48, 60, 71, 72, 84]

      for (const midi of testMidis) {
        const rowTopY = midiToPixelY(midi, rowHeight, scrollY, maxMidi)

        // Test at top edge
        expect(pixelYToMidi(rowTopY, rowHeight, scrollY, maxMidi)).toBe(midi)

        // Test in the middle of the row (+9px)
        expect(pixelYToMidi(rowTopY + 9, rowHeight, scrollY, maxMidi)).toBe(midi)

        // Test near the bottom of the row (+17.9px)
        expect(pixelYToMidi(rowTopY + 17.9, rowHeight, scrollY, maxMidi)).toBe(midi)
      }
    })

    it('should clamp pixelYToMidi within standard MIDI boundaries [0, 127]', () => {
      expect(pixelYToMidi(-1000, rowHeight, 0, 84)).toBeLessThanOrEqual(127)
      expect(pixelYToMidi(10000, rowHeight, 0, 84)).toBe(0)
    })
  })

  describe('Grid Snapping Logic', () => {
    it('should snap to 1/16th notes (1 step in 16n grid)', () => {
      expect(snapStepToGrid(0.2, 1)).toBe(0)
      expect(snapStepToGrid(0.49, 1)).toBe(0)
      expect(snapStepToGrid(0.51, 1)).toBe(1)
      expect(snapStepToGrid(3.7, 1)).toBe(4)
    })

    it('should snap to 1/8th notes (2 steps in 16n grid)', () => {
      expect(snapStepToGrid(0.9, 2)).toBe(0)
      expect(snapStepToGrid(1.1, 2)).toBe(2)
      expect(snapStepToGrid(2.8, 2)).toBe(2)
      expect(snapStepToGrid(3.2, 2)).toBe(4)
    })

    it('should snap to 1/4 notes (4 steps in 16n grid)', () => {
      expect(snapStepToGrid(1.8, 4)).toBe(0)
      expect(snapStepToGrid(2.1, 4)).toBe(4)
      expect(snapStepToGrid(5.9, 4)).toBe(4)
      expect(snapStepToGrid(6.2, 4)).toBe(8)
    })

    it('should snap to 8th-note triplets (4/3 ≈ 1.3333 steps)', () => {
      const tripletStep = 4 / 3 // 1.3333
      // Multiples: 0, 1.3333, 2.6667, 4.0 (midpoints: 0.6667, 2.0, 3.3333)

      expect(snapStepToGrid(0.5, tripletStep)).toBeCloseTo(0, 2)
      expect(snapStepToGrid(0.8, tripletStep)).toBeCloseTo(1.3333, 2)
      expect(snapStepToGrid(2.2, tripletStep)).toBeCloseTo(2.0 * tripletStep, 2)
      expect(snapStepToGrid(3.8, tripletStep)).toBeCloseTo(4.0, 2)
    })

    it('should apply snap in pixelXToStep', () => {
      // With stepWidth 24, keyboardWidth 56, scrollX 0:
      // x = 56 + 1.2 * 24 = 84.8. Raw step = 1.2.
      // Snapping to 1/16 (1) -> 1
      const step16 = pixelXToStep(84.8, stepWidth, 0, keyboardWidth, 1)
      expect(step16).toBe(1)

      // Snapping to 1/8 (2) -> 2 when raw step is 1.6
      const xFor1Point6 = 56 + 1.6 * 24
      const step8 = pixelXToStep(xFor1Point6, stepWidth, 0, keyboardWidth, 2)
      expect(step8).toBe(2)
    })
  })

  describe('Frustum-Culling & Viewport Bounds', () => {
    const bounds = {
      startStep: 16,
      endStep: 32,
      minMidi: 48, // C3
      maxMidi: 72 // C5
    }

    it('should retain notes fully contained within the viewport', () => {
      const note = { step: 20, durationSteps: 4, midi: 60 }
      expect(isNoteInViewport(note, bounds)).toBe(true)
    })

    it('should retain notes intersecting the left/start boundary', () => {
      // Starts at step 14, duration 4 -> ends at step 18 (intersects startStep 16)
      const note = { step: 14, durationSteps: 4, midi: 60 }
      expect(isNoteInViewport(note, bounds)).toBe(true)
    })

    it('should retain notes intersecting the right/end boundary', () => {
      // Starts at step 30, duration 4 -> ends at step 34 (intersects endStep 32)
      const note = { step: 30, durationSteps: 4, midi: 60 }
      expect(isNoteInViewport(note, bounds)).toBe(true)
    })

    it('should cull notes completely before the viewport (past playback)', () => {
      const note = { step: 4, durationSteps: 4, midi: 60 } // ends at 8 < 16
      expect(isNoteInViewport(note, bounds)).toBe(false)
    })

    it('should cull notes completely after the viewport (future steps)', () => {
      const note = { step: 36, durationSteps: 4, midi: 60 } // starts at 36 > 32
      expect(isNoteInViewport(note, bounds)).toBe(false)
    })

    it('should cull notes outside vertical MIDI pitch boundaries', () => {
      // Pitch too high (C6 = 84 > maxMidi 72)
      expect(isNoteInViewport({ step: 20, durationSteps: 4, midi: 84 }, bounds)).toBe(false)

      // Pitch too low (C2 = 36 < minMidi 48)
      expect(isNoteInViewport({ step: 20, durationSteps: 4, midi: 36 }, bounds)).toBe(false)
    })

    it('should compute valid ViewportBounds from pixel dimensions and scroll offsets', () => {
      const viewport = getViewportBounds(
        800, // width
        400, // height
        stepWidth,
        rowHeight,
        120, // scrollX
        90, // scrollY
        keyboardWidth,
        maxMidi
      )

      expect(viewport.startStep).toBeCloseTo(120 / stepWidth, 2)
      expect(viewport.endStep).toBeGreaterThan(viewport.startStep)
      expect(viewport.maxMidi).toBe(84 - Math.floor(90 / rowHeight))
      expect(viewport.minMidi).toBeLessThan(viewport.maxMidi)
    })
  })

  describe('High-DPI Setup (setupCanvasDpi)', () => {
    it('should properly configure canvas dimensions and context scaling', () => {
      const mockContext = {
        scale: vi.fn()
      } as unknown as CanvasRenderingContext2D

      const mockCanvas = {
        width: 0,
        height: 0,
        style: {
          width: '',
          height: ''
        },
        getContext: vi.fn().mockReturnValue(mockContext)
      } as unknown as HTMLCanvasElement

      const width = 800
      const height = 500

      const result = setupCanvasDpi(mockCanvas, width, height)

      expect(mockCanvas.style.width).toBe('800px')
      expect(mockCanvas.style.height).toBe('500px')
      expect(mockCanvas.width).toBeGreaterThanOrEqual(800)
      expect(mockCanvas.height).toBeGreaterThanOrEqual(500)
      expect(mockContext.scale).toHaveBeenCalledWith(result.dpr, result.dpr)
    })
  })

  describe('calculateMaxScrollX (Horizontal Scroll Clamping)', () => {
    it('should return 0 when total bar length fits within the viewport width', () => {
      // 4 bars * 16 steps * 24px = 1536px; + 56px keyboard = 1592px
      // With viewport width 1920px, everything fits
      const maxScroll = calculateMaxScrollX(1920, 24, 4, 56)
      expect(maxScroll).toBe(0)
    })

    it('should return 0 when project width exactly equals viewport width', () => {
      const maxScroll = calculateMaxScrollX(1592, 24, 4, 56)
      expect(maxScroll).toBe(0)
    })

    it('should return the exact offset needed when project exceeds viewport width', () => {
      // 4 bars * 16 * 24 = 1536px; + 56px = 1592px
      // Viewport 1200px -> excess is 1592 - 1200 = 392px
      const maxScroll = calculateMaxScrollX(1200, 24, 4, 56)
      expect(maxScroll).toBe(392)
    })

    it('should scale accurately for larger bar counts (e.g. 16 bars)', () => {
      // 16 bars * 16 steps * 24px = 6144px; + 56px = 6200px
      // Viewport 1400px -> 6200 - 1400 = 4800px
      const maxScroll = calculateMaxScrollX(1400, 24, 16, 56)
      expect(maxScroll).toBe(4800)
    })

    it('should handle small bar counts (e.g. 1 or 2 bars) safely with 0 scroll', () => {
      // 1 bar * 16 * 24 = 384px; + 56px = 440px
      expect(calculateMaxScrollX(800, 24, 1, 56)).toBe(0)
      expect(calculateMaxScrollX(1200, 24, 2, 56)).toBe(0)
    })

    it('should return 0 when dimensions or bars are zero or negative', () => {
      expect(calculateMaxScrollX(0, 24, 4, 56)).toBe(0)
      expect(calculateMaxScrollX(-100, 24, 4, 56)).toBe(0)
      expect(calculateMaxScrollX(1200, 0, 4, 56)).toBe(0)
      expect(calculateMaxScrollX(1200, 24, 0, 56)).toBe(0)
      expect(calculateMaxScrollX(1200, 24, -2, 56)).toBe(0)
    })
  })
})

describe('usePianoRollCanvas – Playhead Follow-Scroll (followNextStep)', () => {
  const keyboardWidth = 56
  const stepWidth = 24
  const viewportWidth = 1000
  // visible track 944px → centering offset 472px
  const params = { stepWidth, viewportWidth, maxScrollX: 2000, keyboardWidth }

  const centeredScroll = (step: number): number => step * stepWidth - (viewportWidth - keyboardWidth) * 0.5

  it('lerps smoothly toward the centered position on forward playback', () => {
    const state: FollowStepState = { step: 39, scrollX: centeredScroll(39) }
    const next = followNextStep(state, 40, params)

    const target = centeredScroll(40)
    expect(next.scrollX).toBeCloseTo(state.scrollX + (target - state.scrollX) * 0.12, 5)
    expect(next.scrollX).toBeGreaterThan(state.scrollX)
    expect(next.step).toBe(40)
  })

  it('keeps moving while only fractional sub-steps advance (no grid hopping)', () => {
    const state: FollowStepState = { step: 40, scrollX: centeredScroll(40) }
    const next = followNextStep(state, 40.5, params)

    expect(next.step).toBe(40.5)
    expect(next.scrollX).toBeGreaterThan(state.scrollX)
    expect(next.scrollX).toBeLessThan(centeredScroll(40.5))
  })

  it('clamps the centered target to the maximum scroll offset', () => {
    const state: FollowStepState = { step: 0, scrollX: 0 }
    const next = followNextStep(state, 90, params)

    // target for step 90 is 1688 (below max 2000): single lerp fraction of the distance
    expect(next.scrollX).toBeCloseTo(1688 * 0.12, 5)

    const far = followNextStep(state, 200, params)
    // step 200 target clamps to 2000 → 240
    expect(far.scrollX).toBeCloseTo(2000 * 0.12, 5)
  })

  it('hard-snaps to the target on backward playhead jumps (loop wrap / seek back)', () => {
    const state: FollowStepState = { step: 80, scrollX: centeredScroll(80) }
    const next = followNextStep(state, 0.4, params)

    expect(next.step).toBe(0.4)
    expect(next.scrollX).toBe(0)
  })

  it('freezes sub-pixel drift and reuses the state object on constant step', () => {
    const settled: FollowStepState = { step: 40, scrollX: centeredScroll(40) }
    expect(followNextStep(settled, 40, params)).toBe(settled)

    const almostSettled: FollowStepState = { step: 40, scrollX: centeredScroll(40) - 0.2 }
    expect(followNextStep(almostSettled, 40, params)).toBe(almostSettled)
  })
})
