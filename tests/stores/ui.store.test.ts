import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { installMockLocalStorage } from '../helpers/storage-mock'
import {
  DEFAULT_CANVAS_GRID,
  DEFAULT_SHOW_WELCOME_ON_STARTUP,
  DEFAULT_UI_DIMENSIONS,
  DEFAULT_UI_PREFERENCES,
  UI_PREFERENCES_VERSION
} from '../../src/config/ui-defaults'
import { useUiStore } from '../../src/stores/ui.store'

describe('useUiStore velocity lane', () => {
  beforeEach(() => {
    installMockLocalStorage()
    setActivePinia(createPinia())
  })

  it('starts with its configured default velocity lane preference and height', () => {
    const store = useUiStore()

    expect(store.isVelocityLaneOpen).toBe(DEFAULT_UI_PREFERENCES.isVelocityLaneOpen)
    expect(store.velocityLaneHeight).toBe(DEFAULT_UI_DIMENSIONS.velocityLane.defaultHeight)
  })

  it('toggles and explicitly sets the collapsed state', () => {
    const store = useUiStore()

    store.toggleVelocityLane()
    expect(store.isVelocityLaneOpen).toBe(!DEFAULT_UI_PREFERENCES.isVelocityLaneOpen)

    store.toggleVelocityLane()
    expect(store.isVelocityLaneOpen).toBe(DEFAULT_UI_PREFERENCES.isVelocityLaneOpen)

    store.setVelocityLane(!DEFAULT_UI_PREFERENCES.isVelocityLaneOpen)
    expect(store.isVelocityLaneOpen).toBe(!DEFAULT_UI_PREFERENCES.isVelocityLaneOpen)
  })

  it('clamps the lane height into the supported range', () => {
    const store = useUiStore()

    store.setVelocityLaneHeight(240)
    expect(store.velocityLaneHeight).toBe(240)

    store.setVelocityLaneHeight(10)
    expect(store.velocityLaneHeight).toBe(DEFAULT_UI_DIMENSIONS.velocityLane.minHeight)

    store.setVelocityLaneHeight(1200)
    expect(store.velocityLaneHeight).toBe(DEFAULT_UI_DIMENSIONS.velocityLane.maxHeight)
  })

  it('rounds fractional lane heights', () => {
    const store = useUiStore()

    store.setVelocityLaneHeight(180.6)
    expect(store.velocityLaneHeight).toBe(181)
  })

  it('resets the lane to its default height', () => {
    const store = useUiStore()

    store.setVelocityLaneHeight(300)
    store.resetVelocityLaneHeight()
    expect(store.velocityLaneHeight).toBe(DEFAULT_UI_DIMENSIONS.velocityLane.defaultHeight)
  })

  it('restores the lane defaults on a full store reset', () => {
    const store = useUiStore()

    store.setVelocityLane(!DEFAULT_UI_PREFERENCES.isVelocityLaneOpen)
    store.setVelocityLaneHeight(280)
    store.reset()

    expect(store.isVelocityLaneOpen).toBe(DEFAULT_UI_PREFERENCES.isVelocityLaneOpen)
    expect(store.velocityLaneHeight).toBe(DEFAULT_UI_DIMENSIONS.velocityLane.defaultHeight)
  })

  it('restores persisted velocity lane preferences when version matches', () => {
    const { storage } = installMockLocalStorage()
    storage.setItem(
      'melodymate-ui-preferences',
      JSON.stringify({
        version: UI_PREFERENCES_VERSION,
        isVelocityLaneOpen: !DEFAULT_UI_PREFERENCES.isVelocityLaneOpen,
        velocityLaneHeight: 180
      })
    )

    setActivePinia(createPinia())
    const store = useUiStore()

    expect(store.isVelocityLaneOpen).toBe(!DEFAULT_UI_PREFERENCES.isVelocityLaneOpen)
    expect(store.velocityLaneHeight).toBe(180)
  })

  it('discards unversioned or mismatched version preferences and falls back to defaults', () => {
    const { storage } = installMockLocalStorage()
    storage.setItem(
      'melodymate-ui-preferences',
      JSON.stringify({
        isVelocityLaneOpen: !DEFAULT_UI_PREFERENCES.isVelocityLaneOpen,
        velocityLaneHeight: 180
      })
    )

    setActivePinia(createPinia())
    const store = useUiStore()

    expect(store.isVelocityLaneOpen).toBe(DEFAULT_UI_PREFERENCES.isVelocityLaneOpen)
    expect(store.velocityLaneHeight).toBe(DEFAULT_UI_DIMENSIONS.velocityLane.defaultHeight)
  })
})

describe('useUiStore chord studio', () => {
  beforeEach(() => {
    installMockLocalStorage()
    setActivePinia(createPinia())
  })

  it('toggles chord studio dock and clamps height', () => {
    const store = useUiStore()

    const initialOpen = DEFAULT_UI_PREFERENCES.activeStudioDock === 'chord'
    expect(store.isChordStudioOpen).toBe(initialOpen)
    store.toggleChordStudio()
    expect(store.isChordStudioOpen).toBe(!initialOpen)
    store.toggleChordStudio()
    expect(store.isChordStudioOpen).toBe(initialOpen)
    store.setChordStudioOpen(false)
    expect(store.isChordStudioOpen).toBe(false)
    store.setChordStudioOpen(true)
    expect(store.isChordStudioOpen).toBe(true)

    store.setChordStudioHeight(350)
    expect(store.chordStudioHeight).toBe(350)
    store.setChordStudioHeight(50)
    expect(store.chordStudioHeight).toBe(DEFAULT_UI_DIMENSIONS.chordStudio.minHeight)
  })
})

describe('useUiStore arp studio', () => {
  beforeEach(() => {
    installMockLocalStorage()
    setActivePinia(createPinia())
  })

  it('opens one studio dock at a time and uses melody history', () => {
    const store = useUiStore()
    store.setChordStudioOpen(true)
    store.toggleArpStudio()

    expect(store.isArpStudioOpen).toBe(true)
    expect(store.isChordStudioOpen).toBe(false)
    expect(store.activeTrack).toBe('melody')
    expect(store.activeHistoryContext).toBe('piano')

    store.setRhythmStudioOpen(true)
    expect(store.isArpStudioOpen).toBe(false)
    store.setArpStudioOpen(true)
    expect(store.isRhythmStudioOpen).toBe(false)
  })

  it('clamps and resets its dock height using UI defaults', () => {
    const store = useUiStore()
    store.setArpStudioHeight(DEFAULT_UI_DIMENSIONS.arpStudio.minHeight - 1)
    expect(store.arpStudioHeight).toBe(DEFAULT_UI_DIMENSIONS.arpStudio.minHeight)
    store.setArpStudioHeight(DEFAULT_UI_DIMENSIONS.arpStudio.maxHeight + 1)
    expect(store.arpStudioHeight).toBe(DEFAULT_UI_DIMENSIONS.arpStudio.maxHeight)
    store.resetArpStudioHeight()
    expect(store.arpStudioHeight).toBe(DEFAULT_UI_DIMENSIONS.arpStudio.defaultHeight)
  })
})

describe('useUiStore sidebars', () => {
  beforeEach(() => {
    installMockLocalStorage()
    setActivePinia(createPinia())
  })

  it('allows both sidebars to be open simultaneously on wide viewports', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1440 })
    const store = useUiStore()

    store.setLeftSidebar(true)
    store.setRightSidebar(true)

    expect(store.isLeftSidebarOpen).toBe(true)
    expect(store.isRightSidebarOpen).toBe(true)
    expect(store.wideLeftSidebarOpen).toBe(true)
    expect(store.wideRightSidebarOpen).toBe(true)
  })

  it('enforces exclusive drawers on narrow viewports without mutating wide preference', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1440 })
    const store = useUiStore()

    store.setLeftSidebar(true)
    store.setRightSidebar(true)

    // Switch to narrow viewport
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 })

    // Opening left drawer should close right drawer
    store.setLeftSidebar(true)
    expect(store.isLeftSidebarOpen).toBe(true)
    expect(store.isRightSidebarOpen).toBe(false)

    // Opening right drawer should close left drawer
    store.setRightSidebar(true)
    expect(store.isLeftSidebarOpen).toBe(false)
    expect(store.isRightSidebarOpen).toBe(true)

    // Desktop preferences were preserved!
    expect(store.wideLeftSidebarOpen).toBe(true)
    expect(store.wideRightSidebarOpen).toBe(true)
  })

  it('toggles sidebars correctly', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1440 })
    const store = useUiStore()

    store.setLeftSidebar(true)
    store.toggleLeftSidebar()
    expect(store.isLeftSidebarOpen).toBe(false)
    store.toggleLeftSidebar()
    expect(store.isLeftSidebarOpen).toBe(true)
  })

  it('resets left sidebar width to defaultWidth, not minWidth', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1600 })
    const store = useUiStore()

    store.setLeftSidebarWidth(DEFAULT_UI_DIMENSIONS.leftSidebar.maxWidth)
    expect(store.leftSidebarWidth).toBe(DEFAULT_UI_DIMENSIONS.leftSidebar.maxWidth)

    store.resetLeftSidebarWidth()
    expect(store.leftSidebarWidth).toBe(DEFAULT_UI_DIMENSIONS.leftSidebar.defaultWidth)
  })

  it('resets right sidebar width to defaultWidth', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1600 })
    const store = useUiStore()

    store.setRightSidebarWidth(DEFAULT_UI_DIMENSIONS.rightSidebar.maxWidth)
    expect(store.rightSidebarWidth).toBe(DEFAULT_UI_DIMENSIONS.rightSidebar.maxWidth)

    store.resetRightSidebarWidth()
    expect(store.rightSidebarWidth).toBe(DEFAULT_UI_DIMENSIONS.rightSidebar.defaultWidth)
  })
})

describe('useUiStore defaults and reset', () => {
  beforeEach(() => {
    installMockLocalStorage()
    setActivePinia(createPinia())
  })

  it('cycles snap grid between the available toolbar resolutions', () => {
    const store = useUiStore()
    store.setSnapStep(4)

    store.cycleSnapGrid('finer')
    expect(store.snapStep).toBe(2)
    store.cycleSnapGrid('finer')
    store.cycleSnapGrid('finer')
    expect(store.snapStep).toBe(1)
    store.cycleSnapGrid('coarser')
    expect(store.snapStep).toBe(2)
    store.cycleSnapGrid('coarser')
    store.cycleSnapGrid('coarser')
    expect(store.snapStep).toBe(4)
  })

  it('initializes and resets state matching global UI config constants', () => {
    const store = useUiStore()

    expect(store.stepWidth).toBe(DEFAULT_CANVAS_GRID.stepWidth)
    expect(store.rowHeight).toBe(DEFAULT_CANVAS_GRID.rowHeight)
    expect(store.scrollX).toBe(DEFAULT_CANVAS_GRID.scrollX)
    expect(store.scrollY).toBe(DEFAULT_CANVAS_GRID.scrollY)

    expect(store.activeTool).toBe(DEFAULT_UI_PREFERENCES.activeTool)
    expect(store.activeTrack).toBe(DEFAULT_UI_PREFERENCES.activeTrack)
    expect(store.snapStep).toBe(DEFAULT_UI_PREFERENCES.snapStep)
    expect(store.isAuditionEnabled).toBe(DEFAULT_UI_PREFERENCES.isAuditionEnabled)
    expect(store.isScaleLocked).toBe(DEFAULT_UI_PREFERENCES.isScaleLocked)
    expect(store.returnToStartOnPause).toBe(DEFAULT_UI_PREFERENCES.returnToStartOnPause)
    expect(store.playFromLoopStart).toBe(DEFAULT_UI_PREFERENCES.playFromLoopStart)
    expect(store.isLeftSidebarOpen).toBe(DEFAULT_UI_PREFERENCES.isLeftSidebarOpen)
    expect(store.isRightSidebarOpen).toBe(DEFAULT_UI_PREFERENCES.isRightSidebarOpen)
    expect(store.isSoundDockOpen).toBe(DEFAULT_UI_PREFERENCES.isSoundDockOpen)
    expect(store.activeStudioDock).toBe(DEFAULT_UI_PREFERENCES.activeStudioDock)

    expect(store.leftSidebarWidth).toBe(DEFAULT_UI_DIMENSIONS.leftSidebar.defaultWidth)
    expect(store.rightSidebarWidth).toBe(DEFAULT_UI_DIMENSIONS.rightSidebar.defaultWidth)
    expect(store.soundDockHeight).toBe(DEFAULT_UI_DIMENSIONS.soundDock.defaultHeight)
    expect(store.chordStudioHeight).toBe(DEFAULT_UI_DIMENSIONS.chordStudio.defaultHeight)
    expect(store.rhythmStudioHeight).toBe(DEFAULT_UI_DIMENSIONS.rhythmStudio.defaultHeight)
    expect(store.isVelocityLaneOpen).toBe(DEFAULT_UI_PREFERENCES.isVelocityLaneOpen)
    expect(store.velocityLaneHeight).toBe(DEFAULT_UI_DIMENSIONS.velocityLane.defaultHeight)

    // Mutate all dimensions and preferences
    store.setStepWidth(48)
    store.setRowHeight(24)
    store.setScroll(100, 200)
    store.setActiveTool('pencil')
    store.setActiveTrack('chords')
    store.setSnapStep(2)
    store.setAudition(true)
    store.setScaleLocked(false)
    store.setReturnToStartOnPause(false)
    store.setPlayFromLoopStart(false)
    store.setSoundDockOpen(true)
    store.setSoundDockHeight(300)
    store.setChordStudioOpen(true)
    store.setChordStudioHeight(350)
    store.setRhythmStudioOpen(true)
    store.setRhythmStudioHeight(320)
    store.setLeftSidebarWidth(400)
    store.setRightSidebarWidth(400)
    store.setVelocityLane(true)
    store.setVelocityLaneHeight(180)

    // Reset back
    store.reset()

    expect(store.stepWidth).toBe(DEFAULT_CANVAS_GRID.stepWidth)
    expect(store.rowHeight).toBe(DEFAULT_CANVAS_GRID.rowHeight)
    expect(store.scrollX).toBe(DEFAULT_CANVAS_GRID.scrollX)
    expect(store.scrollY).toBe(DEFAULT_CANVAS_GRID.scrollY)
    expect(store.activeTool).toBe(DEFAULT_UI_PREFERENCES.activeTool)
    expect(store.activeTrack).toBe(DEFAULT_UI_PREFERENCES.activeTrack)
    expect(store.snapStep).toBe(DEFAULT_UI_PREFERENCES.snapStep)
    expect(store.isAuditionEnabled).toBe(DEFAULT_UI_PREFERENCES.isAuditionEnabled)
    expect(store.isScaleLocked).toBe(DEFAULT_UI_PREFERENCES.isScaleLocked)
    expect(store.returnToStartOnPause).toBe(DEFAULT_UI_PREFERENCES.returnToStartOnPause)
    expect(store.playFromLoopStart).toBe(DEFAULT_UI_PREFERENCES.playFromLoopStart)
    expect(store.isLeftSidebarOpen).toBe(DEFAULT_UI_PREFERENCES.isLeftSidebarOpen)
    expect(store.isRightSidebarOpen).toBe(DEFAULT_UI_PREFERENCES.isRightSidebarOpen)
    expect(store.isSoundDockOpen).toBe(DEFAULT_UI_PREFERENCES.isSoundDockOpen)
    expect(store.activeStudioDock).toBe(DEFAULT_UI_PREFERENCES.activeStudioDock)
    expect(store.soundDockHeight).toBe(DEFAULT_UI_DIMENSIONS.soundDock.defaultHeight)
    expect(store.chordStudioHeight).toBe(DEFAULT_UI_DIMENSIONS.chordStudio.defaultHeight)
    expect(store.rhythmStudioHeight).toBe(DEFAULT_UI_DIMENSIONS.rhythmStudio.defaultHeight)
    expect(store.leftSidebarWidth).toBe(DEFAULT_UI_DIMENSIONS.leftSidebar.defaultWidth)
    expect(store.rightSidebarWidth).toBe(DEFAULT_UI_DIMENSIONS.rightSidebar.defaultWidth)
    expect(store.isVelocityLaneOpen).toBe(DEFAULT_UI_PREFERENCES.isVelocityLaneOpen)
    expect(store.velocityLaneHeight).toBe(DEFAULT_UI_DIMENSIONS.velocityLane.defaultHeight)
    expect(store.hasSeenWelcome).toBe(false)
    expect(store.showWelcomeOnStartup).toBe(DEFAULT_SHOW_WELCOME_ON_STARTUP)
  })

  it('resets rhythm studio height individually to defaultHeight', () => {
    const store = useUiStore()

    store.setRhythmStudioHeight(350)
    expect(store.rhythmStudioHeight).toBe(350)

    store.resetRhythmStudioHeight()
    expect(store.rhythmStudioHeight).toBe(DEFAULT_UI_DIMENSIONS.rhythmStudio.defaultHeight)
  })

  it('initializes cleanly from empty localStorage matching all defaults', () => {
    const { storage } = installMockLocalStorage()
    storage.clear()

    setActivePinia(createPinia())
    const store = useUiStore()

    expect(store.leftSidebarWidth).toBe(DEFAULT_UI_DIMENSIONS.leftSidebar.defaultWidth)
    expect(store.rightSidebarWidth).toBe(DEFAULT_UI_DIMENSIONS.rightSidebar.defaultWidth)
    expect(store.soundDockHeight).toBe(DEFAULT_UI_DIMENSIONS.soundDock.defaultHeight)
    expect(store.chordStudioHeight).toBe(DEFAULT_UI_DIMENSIONS.chordStudio.defaultHeight)
    expect(store.rhythmStudioHeight).toBe(DEFAULT_UI_DIMENSIONS.rhythmStudio.defaultHeight)
    expect(store.velocityLaneHeight).toBe(DEFAULT_UI_DIMENSIONS.velocityLane.defaultHeight)
    expect(store.isVelocityLaneOpen).toBe(DEFAULT_UI_PREFERENCES.isVelocityLaneOpen)
    expect(store.isLeftSidebarOpen).toBe(DEFAULT_UI_PREFERENCES.isLeftSidebarOpen)
    expect(store.isRightSidebarOpen).toBe(DEFAULT_UI_PREFERENCES.isRightSidebarOpen)
    expect(store.isSoundDockOpen).toBe(DEFAULT_UI_PREFERENCES.isSoundDockOpen)
    expect(store.activeStudioDock).toBe(DEFAULT_UI_PREFERENCES.activeStudioDock)
  })

  it('manages modal visibility for shortcuts and about dialogs', () => {
    const store = useUiStore()

    expect(store.activeModal).toBeNull()
    expect(store.isShortcutsOpen).toBe(false)
    expect(store.isAboutOpen).toBe(false)

    // Open about modal
    store.openAbout()
    expect(store.activeModal).toBe('about')
    expect(store.isAboutOpen).toBe(true)
    expect(store.isShortcutsOpen).toBe(false)

    // Toggle about closes it
    store.toggleAbout()
    expect(store.activeModal).toBeNull()
    expect(store.isAboutOpen).toBe(false)

    // Open shortcuts modal
    store.openShortcuts()
    expect(store.activeModal).toBe('shortcuts')
    expect(store.isShortcutsOpen).toBe(true)
    expect(store.isAboutOpen).toBe(false)

    // Open about replaces active modal
    store.openAbout()
    expect(store.activeModal).toBe('about')
    expect(store.isAboutOpen).toBe(true)
    expect(store.isShortcutsOpen).toBe(false)

    // Close about
    store.closeAbout()
    expect(store.activeModal).toBeNull()
    expect(store.isAboutOpen).toBe(false)
  })

  it('manages welcome modal visibility, startup preference and first-run check', () => {
    const { storage } = installMockLocalStorage()
    storage.clear()

    setActivePinia(createPinia())
    const store = useUiStore()

    expect(store.isWelcomeOpen).toBe(false)
    expect(store.showWelcomeOnStartup).toBe(false)

    // Open and close welcome directly
    store.openWelcome()
    expect(store.isWelcomeOpen).toBe(true)
    expect(store.activeModal).toBe('welcome')

    store.closeWelcome()
    expect(store.isWelcomeOpen).toBe(false)
    expect(store.activeModal).toBeNull()

    // Toggle welcome
    store.toggleWelcome()
    expect(store.isWelcomeOpen).toBe(true)
    store.toggleWelcome()
    expect(store.isWelcomeOpen).toBe(false)

    // First-run startup check: opens modal when never seen before
    storage.clear()
    setActivePinia(createPinia())
    const freshStore = useUiStore()

    freshStore.checkStartupWelcome()
    expect(freshStore.isWelcomeOpen).toBe(true)
    expect(freshStore.hasSeenWelcome).toBe(true)

    // Close welcome and verify next checkStartupWelcome does NOT reopen when showWelcomeOnStartup is false
    freshStore.closeWelcome()
    expect(freshStore.isWelcomeOpen).toBe(false)

    freshStore.checkStartupWelcome()
    expect(freshStore.isWelcomeOpen).toBe(false)

    // When showWelcomeOnStartup is set to true, checkStartupWelcome opens it
    freshStore.setShowWelcomeOnStartup(true)
    expect(freshStore.showWelcomeOnStartup).toBe(true)

    freshStore.closeWelcome()
    expect(freshStore.isWelcomeOpen).toBe(false)

    freshStore.checkStartupWelcome()
    expect(freshStore.isWelcomeOpen).toBe(true)

    // Resetting settings resets welcome state so it reopens on next reload/startup
    freshStore.closeWelcome()
    freshStore.reset()
    expect(freshStore.hasSeenWelcome).toBe(false)
    expect(freshStore.showWelcomeOnStartup).toBe(DEFAULT_SHOW_WELCOME_ON_STARTUP)

    // Simulating next app launch / page reload
    setActivePinia(createPinia())
    const reloadedStore = useUiStore()
    reloadedStore.checkStartupWelcome()
    expect(reloadedStore.isWelcomeOpen).toBe(true)
  })
})
