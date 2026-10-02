import { describe, expect, it } from 'vitest'
import {
  CANVAS_GRID_BOUNDS,
  DEFAULT_CANVAS_GRID,
  DEFAULT_MODULE_LAYOUT,
  DEFAULT_SHOW_WELCOME_ON_STARTUP,
  DEFAULT_UI_DIMENSIONS,
  DEFAULT_UI_PREFERENCES,
  EXPRESSION_PANEL_MODULE_KEYS,
  GENERATOR_PANEL_MODULE_KEYS
} from '../../src/config/ui-defaults'

describe('UI defaults configuration', () => {
  describe('DEFAULT_UI_DIMENSIONS invariants', () => {
    it('maintains valid width bounds for sidebars', () => {
      const { leftSidebar, rightSidebar } = DEFAULT_UI_DIMENSIONS

      expect(leftSidebar.minWidth).toBeGreaterThan(0)
      expect(leftSidebar.minWidth).toBeLessThanOrEqual(leftSidebar.defaultWidth)
      expect(leftSidebar.defaultWidth).toBeLessThanOrEqual(leftSidebar.maxWidth)

      expect(rightSidebar.minWidth).toBeGreaterThan(0)
      expect(rightSidebar.minWidth).toBeLessThanOrEqual(rightSidebar.defaultWidth)
      expect(rightSidebar.defaultWidth).toBeLessThanOrEqual(rightSidebar.maxWidth)
    })

    it('maintains valid height bounds for docks and studios', () => {
      const { soundDock, chordStudio, rhythmStudio, velocityLane } = DEFAULT_UI_DIMENSIONS

      expect(soundDock.minHeight).toBeGreaterThan(0)
      expect(soundDock.minHeight).toBeLessThanOrEqual(soundDock.defaultHeight)
      expect(soundDock.defaultHeight).toBeLessThanOrEqual(soundDock.maxHeight)

      expect(chordStudio.minHeight).toBeGreaterThan(0)
      expect(chordStudio.minHeight).toBeLessThanOrEqual(chordStudio.defaultHeight)
      expect(chordStudio.defaultHeight).toBeLessThanOrEqual(chordStudio.maxHeight)

      expect(rhythmStudio.minHeight).toBeGreaterThan(0)
      expect(rhythmStudio.minHeight).toBeLessThanOrEqual(rhythmStudio.defaultHeight)
      expect(rhythmStudio.defaultHeight).toBeLessThanOrEqual(rhythmStudio.maxHeight)

      expect(velocityLane.minHeight).toBeGreaterThan(0)
      expect(velocityLane.minHeight).toBeLessThanOrEqual(velocityLane.defaultHeight)
      expect(velocityLane.defaultHeight).toBeLessThanOrEqual(velocityLane.maxHeight)
    })

    it('maintains positive minimum viewport safety thresholds', () => {
      expect(DEFAULT_UI_DIMENSIONS.minCenterViewportWidth).toBeGreaterThan(0)
      expect(DEFAULT_UI_DIMENSIONS.minRollViewportHeight).toBeGreaterThan(0)
    })
  })

  describe('DEFAULT_CANVAS_GRID invariants', () => {
    it('stays within permitted canvas grid bounds', () => {
      expect(DEFAULT_CANVAS_GRID.stepWidth).toBeGreaterThanOrEqual(CANVAS_GRID_BOUNDS.minStepWidth)
      expect(DEFAULT_CANVAS_GRID.stepWidth).toBeLessThanOrEqual(CANVAS_GRID_BOUNDS.maxStepWidth)

      expect(DEFAULT_CANVAS_GRID.rowHeight).toBeGreaterThanOrEqual(CANVAS_GRID_BOUNDS.minRowHeight)
      expect(DEFAULT_CANVAS_GRID.rowHeight).toBeLessThanOrEqual(CANVAS_GRID_BOUNDS.maxRowHeight)

      expect(DEFAULT_CANVAS_GRID.scrollX).toBeGreaterThanOrEqual(0)
      expect(DEFAULT_CANVAS_GRID.scrollY).toBeGreaterThanOrEqual(0)
    })
  })

  describe('DEFAULT_UI_PREFERENCES invariants', () => {
    it('uses valid tools and tracks', () => {
      expect(['select', 'lasso', 'pencil', 'eraser', 'pan']).toContain(DEFAULT_UI_PREFERENCES.activeTool)
      expect(['melody', 'chords']).toContain(DEFAULT_UI_PREFERENCES.activeTrack)
      expect(DEFAULT_UI_PREFERENCES.snapStep).toBeGreaterThanOrEqual(1)
    })

    it('uses valid boolean toggle defaults', () => {
      expect(typeof DEFAULT_UI_PREFERENCES.isAuditionEnabled).toBe('boolean')
      expect(typeof DEFAULT_UI_PREFERENCES.isScaleLocked).toBe('boolean')
      expect(typeof DEFAULT_UI_PREFERENCES.returnToStartOnPause).toBe('boolean')
      expect(typeof DEFAULT_UI_PREFERENCES.playFromLoopStart).toBe('boolean')
      expect(DEFAULT_SHOW_WELCOME_ON_STARTUP).toBe(false)
    })

    it('uses valid dock status defaults', () => {
      expect(typeof DEFAULT_UI_PREFERENCES.isLeftSidebarOpen).toBe('boolean')
      expect(typeof DEFAULT_UI_PREFERENCES.isRightSidebarOpen).toBe('boolean')
      expect(typeof DEFAULT_UI_PREFERENCES.isVelocityLaneOpen).toBe('boolean')

      if (DEFAULT_UI_PREFERENCES.activeStudioDock !== null) {
        expect(['chord', 'rhythm', 'arp', 'sound']).toContain(DEFAULT_UI_PREFERENCES.activeStudioDock)
      } else {
        expect(DEFAULT_UI_PREFERENCES.activeStudioDock).toBeNull()
      }
    })
  })

  describe('DEFAULT_MODULE_LAYOUT invariants', () => {
    it('defines initial open states for all generator and expression modules', () => {
      for (const key of GENERATOR_PANEL_MODULE_KEYS) {
        expect(typeof DEFAULT_MODULE_LAYOUT[key]).toBe('boolean')
      }
      for (const key of EXPRESSION_PANEL_MODULE_KEYS) {
        expect(typeof DEFAULT_MODULE_LAYOUT[key]).toBe('boolean')
      }
    })
  })
})
