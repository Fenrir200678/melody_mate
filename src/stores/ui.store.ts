import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  type ActiveTool,
  type ActiveTrack,
  type StudioDock,
  ARP_STUDIO_DEFAULT_HEIGHT,
  ARP_STUDIO_MAX_HEIGHT,
  ARP_STUDIO_MIN_HEIGHT,
  STUDIO_MIN_ROLL_HEIGHT,
  DEFAULT_CANVAS_GRID,
  DEFAULT_UI_PREFERENCES,
  CHORD_STUDIO_DEFAULT_HEIGHT,
  CHORD_STUDIO_MAX_HEIGHT,
  CHORD_STUDIO_MIN_HEIGHT,
  LEFT_SIDEBAR_DEFAULT_WIDTH,
  LEFT_SIDEBAR_MAX_WIDTH,
  LEFT_SIDEBAR_MIN_WIDTH,
  MIN_CENTER_VIEWPORT_WIDTH,
  RIGHT_SIDEBAR_DEFAULT_WIDTH,
  RIGHT_SIDEBAR_MAX_WIDTH,
  RIGHT_SIDEBAR_MIN_WIDTH,
  SNAP_GRID_STEPS,
  RHYTHM_STUDIO_DEFAULT_HEIGHT,
  RHYTHM_STUDIO_MAX_HEIGHT,
  RHYTHM_STUDIO_MIN_HEIGHT,
  SOUND_DOCK_DEFAULT_HEIGHT,
  SOUND_DOCK_MAX_HEIGHT,
  SOUND_DOCK_MIN_HEIGHT,
  VELOCITY_LANE_DEFAULT_HEIGHT,
  VELOCITY_LANE_MAX_HEIGHT,
  VELOCITY_LANE_MIN_HEIGHT,
  UI_PREFERENCES_VERSION,
  DEFAULT_SHOW_WELCOME_ON_STARTUP,
  DEFAULT_SOUND_DOCK_VIEW,
  type SoundDockView
} from '../config/ui-defaults'
import { useUiLayout } from '../composables/useUiLayout'
import { readUiPreferences, saveUiPreferences } from '../composables/uiStorage'

export type { ActiveTool, ActiveTrack, SoundDockView, StudioDock }
export { DEFAULT_SOUND_DOCK_VIEW }
export type UiZoomAction =
  | 'zoomInHorizontal'
  | 'zoomOutHorizontal'
  | 'zoomInVertical'
  | 'zoomOutVertical'
  | 'fitLoop'
  | 'fitHeight'
  | 'resetZoom'

export interface UiZoomSignal {
  action: UiZoomAction
  timestamp: number
}
export {
  ARP_STUDIO_DEFAULT_HEIGHT,
  ARP_STUDIO_MAX_HEIGHT,
  ARP_STUDIO_MIN_HEIGHT,
  STUDIO_MIN_ROLL_HEIGHT,
  CHORD_STUDIO_DEFAULT_HEIGHT,
  CHORD_STUDIO_MAX_HEIGHT,
  CHORD_STUDIO_MIN_HEIGHT,
  LEFT_SIDEBAR_DEFAULT_WIDTH,
  LEFT_SIDEBAR_MAX_WIDTH,
  LEFT_SIDEBAR_MIN_WIDTH,
  MIN_CENTER_VIEWPORT_WIDTH,
  RIGHT_SIDEBAR_DEFAULT_WIDTH,
  RIGHT_SIDEBAR_MAX_WIDTH,
  RIGHT_SIDEBAR_MIN_WIDTH,
  RHYTHM_STUDIO_DEFAULT_HEIGHT,
  RHYTHM_STUDIO_MAX_HEIGHT,
  RHYTHM_STUDIO_MIN_HEIGHT,
  SOUND_DOCK_DEFAULT_HEIGHT,
  SOUND_DOCK_MAX_HEIGHT,
  SOUND_DOCK_MIN_HEIGHT,
  VELOCITY_LANE_DEFAULT_HEIGHT,
  VELOCITY_LANE_MAX_HEIGHT,
  VELOCITY_LANE_MIN_HEIGHT,
  UI_PREFERENCES_VERSION
}

export const useUiStore = defineStore('ui', () => {
  const activeTool = ref<ActiveTool>(DEFAULT_UI_PREFERENCES.activeTool)
  const activeTrack = ref<ActiveTrack>(DEFAULT_UI_PREFERENCES.activeTrack)
  const activeHistoryContext = ref<'piano' | 'chord' | 'rhythm'>('piano')
  const snapStep = ref<number>(DEFAULT_UI_PREFERENCES.snapStep)
  const stepWidth = ref<number>(DEFAULT_CANVAS_GRID.stepWidth)
  const rowHeight = ref<number>(DEFAULT_CANVAS_GRID.rowHeight)
  const scrollX = ref<number>(DEFAULT_CANVAS_GRID.scrollX)
  const scrollY = ref<number>(DEFAULT_CANVAS_GRID.scrollY)
  const isAuditionEnabled = ref<boolean>(DEFAULT_UI_PREFERENCES.isAuditionEnabled)
  const isScaleLocked = ref<boolean>(DEFAULT_UI_PREFERENCES.isScaleLocked)
  const returnToStartOnPause = ref<boolean>(DEFAULT_UI_PREFERENCES.returnToStartOnPause)
  const playFromLoopStart = ref<boolean>(DEFAULT_UI_PREFERENCES.playFromLoopStart)
  const activeModal = ref<string | null>(null)
  const zoomSignal = ref<UiZoomSignal | null>(null)

  function triggerZoom(action: UiZoomAction): void {
    zoomSignal.value = { action, timestamp: Date.now() }
  }

  function zoomInHorizontal(): void {
    triggerZoom('zoomInHorizontal')
  }

  function zoomOutHorizontal(): void {
    triggerZoom('zoomOutHorizontal')
  }

  function zoomInVertical(): void {
    triggerZoom('zoomInVertical')
  }

  function zoomOutVertical(): void {
    triggerZoom('zoomOutVertical')
  }

  function fitLoop(): void {
    triggerZoom('fitLoop')
  }

  function fitHeight(): void {
    triggerZoom('fitHeight')
  }

  function resetZoom(): void {
    triggerZoom('resetZoom')
  }

  const layout = useUiLayout({ activeTrack, activeHistoryContext })

  function setActiveTool(tool: ActiveTool): void {
    activeTool.value = tool
  }

  function setActiveTrack(track: ActiveTrack): void {
    activeTrack.value = track
    activeHistoryContext.value = 'piano'
  }

  function setActiveHistoryContext(context: 'piano' | 'chord' | 'rhythm'): void {
    activeHistoryContext.value = context
  }

  function setSnapStep(step: number): void {
    snapStep.value = Math.max(1, Math.round(step))
  }

  function cycleSnapGrid(direction: 'finer' | 'coarser'): void {
    const nextStep =
      direction === 'finer'
        ? [...SNAP_GRID_STEPS].reverse().find((step) => step < snapStep.value)
        : SNAP_GRID_STEPS.find((step) => step > snapStep.value)
    snapStep.value =
      nextStep ?? (direction === 'finer' ? SNAP_GRID_STEPS[0] : SNAP_GRID_STEPS[SNAP_GRID_STEPS.length - 1])
  }

  function setStepWidth(width: number): void {
    stepWidth.value = Math.max(8, Math.min(96, Math.round(width)))
  }

  function setRowHeight(height: number): void {
    rowHeight.value = Math.max(12, Math.min(36, Math.round(height)))
  }

  function setScroll(x: number, y: number): void {
    scrollX.value = Math.max(0, x)
    scrollY.value = Math.max(0, y)
  }

  function setAudition(enabled: boolean): void {
    isAuditionEnabled.value = enabled
  }

  function toggleAudition(): void {
    isAuditionEnabled.value = !isAuditionEnabled.value
  }

  function setScaleLocked(locked: boolean): void {
    isScaleLocked.value = locked
  }

  function toggleScaleLocked(): void {
    isScaleLocked.value = !isScaleLocked.value
  }

  function setReturnToStartOnPause(enabled: boolean): void {
    returnToStartOnPause.value = enabled
  }

  function toggleReturnToStartOnPause(): void {
    returnToStartOnPause.value = !returnToStartOnPause.value
  }

  function setPlayFromLoopStart(enabled: boolean): void {
    playFromLoopStart.value = enabled
  }

  function togglePlayFromLoopStart(): void {
    playFromLoopStart.value = !playFromLoopStart.value
  }

  function openModal(modalId: string): void {
    activeModal.value = modalId
  }

  function closeModal(): void {
    activeModal.value = null
  }

  const isShortcutsOpen = computed(() => activeModal.value === 'shortcuts')

  function openShortcuts(): void {
    openModal('shortcuts')
  }

  function closeShortcuts(): void {
    if (activeModal.value === 'shortcuts') {
      closeModal()
    }
  }

  function toggleShortcuts(): void {
    if (activeModal.value === 'shortcuts') {
      closeModal()
    } else {
      openModal('shortcuts')
    }
  }

  const isAboutOpen = computed(() => activeModal.value === 'about')

  function openAbout(): void {
    openModal('about')
  }

  function closeAbout(): void {
    if (activeModal.value === 'about') {
      closeModal()
    }
  }

  function toggleAbout(): void {
    if (activeModal.value === 'about') {
      closeModal()
    } else {
      openModal('about')
    }
  }

  const isWelcomeOpen = computed(() => activeModal.value === 'welcome')
  const initialPrefs = readUiPreferences()
  const showWelcomeOnStartup = ref<boolean>(initialPrefs?.showWelcomeOnStartup ?? DEFAULT_SHOW_WELCOME_ON_STARTUP)
  const hasSeenWelcome = ref<boolean>(initialPrefs?.hasSeenWelcome ?? false)

  function openWelcome(): void {
    openModal('welcome')
  }

  function closeWelcome(): void {
    if (activeModal.value === 'welcome') {
      closeModal()
    }
  }

  function toggleWelcome(): void {
    if (activeModal.value === 'welcome') {
      closeModal()
    } else {
      openModal('welcome')
    }
  }

  function setShowWelcomeOnStartup(enabled: boolean): void {
    showWelcomeOnStartup.value = enabled
    saveUiPreferences({ showWelcomeOnStartup: enabled })
  }

  function checkStartupWelcome(): void {
    const prefs = readUiPreferences()
    const seen = prefs?.hasSeenWelcome ?? false
    const show = prefs?.showWelcomeOnStartup ?? DEFAULT_SHOW_WELCOME_ON_STARTUP
    if (!seen || show) {
      openWelcome()
      if (!seen) {
        hasSeenWelcome.value = true
        saveUiPreferences({ hasSeenWelcome: true, showWelcomeOnStartup: show })
      }
    }
  }

  function reset(): void {
    activeTool.value = DEFAULT_UI_PREFERENCES.activeTool
    activeTrack.value = DEFAULT_UI_PREFERENCES.activeTrack
    snapStep.value = DEFAULT_UI_PREFERENCES.snapStep
    stepWidth.value = DEFAULT_CANVAS_GRID.stepWidth
    rowHeight.value = DEFAULT_CANVAS_GRID.rowHeight
    scrollX.value = DEFAULT_CANVAS_GRID.scrollX
    scrollY.value = DEFAULT_CANVAS_GRID.scrollY
    isAuditionEnabled.value = DEFAULT_UI_PREFERENCES.isAuditionEnabled
    isScaleLocked.value = DEFAULT_UI_PREFERENCES.isScaleLocked
    returnToStartOnPause.value = DEFAULT_UI_PREFERENCES.returnToStartOnPause
    playFromLoopStart.value = DEFAULT_UI_PREFERENCES.playFromLoopStart
    activeHistoryContext.value = 'piano'
    zoomSignal.value = null
    hasSeenWelcome.value = false
    showWelcomeOnStartup.value = DEFAULT_SHOW_WELCOME_ON_STARTUP
    saveUiPreferences({
      hasSeenWelcome: false,
      showWelcomeOnStartup: DEFAULT_SHOW_WELCOME_ON_STARTUP
    })
    layout.resetLayout()
  }

  return {
    activeTool,
    activeTrack,
    activeHistoryContext,
    snapStep,
    stepWidth,
    rowHeight,
    scrollX,
    scrollY,
    zoomSignal,
    isAuditionEnabled,
    isScaleLocked,
    returnToStartOnPause,
    playFromLoopStart,
    activeModal,
    isShortcutsOpen,
    setActiveTool,
    setActiveTrack,
    setActiveHistoryContext,
    setSnapStep,
    cycleSnapGrid,
    setStepWidth,
    setRowHeight,
    setScroll,
    triggerZoom,
    zoomInHorizontal,
    zoomOutHorizontal,
    zoomInVertical,
    zoomOutVertical,
    fitLoop,
    fitHeight,
    resetZoom,
    setAudition,
    toggleAudition,
    setScaleLocked,
    toggleScaleLocked,
    setReturnToStartOnPause,
    toggleReturnToStartOnPause,
    setPlayFromLoopStart,
    togglePlayFromLoopStart,
    reset,
    openModal,
    closeModal,
    openShortcuts,
    closeShortcuts,
    toggleShortcuts,
    isAboutOpen,
    openAbout,
    closeAbout,
    toggleAbout,
    isWelcomeOpen,
    showWelcomeOnStartup,
    hasSeenWelcome,
    openWelcome,
    closeWelcome,
    toggleWelcome,
    setShowWelcomeOnStartup,
    checkStartupWelcome,
    // Layout and dock state & actions
    isLeftSidebarOpen: layout.isLeftSidebarOpen,
    isRightSidebarOpen: layout.isRightSidebarOpen,
    wideLeftSidebarOpen: layout.wideLeftSidebarOpen,
    wideRightSidebarOpen: layout.wideRightSidebarOpen,
    isSoundDockOpen: layout.isSoundDockOpen,
    activeStudioDock: layout.activeStudioDock,
    isChordStudioOpen: layout.isChordStudioOpen,
    isRhythmStudioOpen: layout.isRhythmStudioOpen,
    isArpStudioOpen: layout.isArpStudioOpen,
    soundDockHeight: layout.soundDockHeight,
    chordStudioHeight: layout.chordStudioHeight,
    rhythmStudioHeight: layout.rhythmStudioHeight,
    arpStudioHeight: layout.arpStudioHeight,
    leftSidebarWidth: layout.leftSidebarWidth,
    rightSidebarWidth: layout.rightSidebarWidth,
    isVelocityLaneOpen: layout.isVelocityLaneOpen,
    velocityLaneHeight: layout.velocityLaneHeight,
    toggleLeftSidebar: layout.toggleLeftSidebar,
    toggleRightSidebar: layout.toggleRightSidebar,
    setLeftSidebar: layout.setLeftSidebar,
    setRightSidebar: layout.setRightSidebar,
    toggleSoundDock: layout.toggleSoundDock,
    setSoundDockOpen: layout.setSoundDockOpen,
    soundDockView: layout.soundDockView,
    setSoundDockView: layout.setSoundDockView,
    setSoundDockHeight: layout.setSoundDockHeight,
    resetSoundDockHeight: layout.resetSoundDockHeight,
    toggleChordStudio: layout.toggleChordStudio,
    setChordStudioOpen: layout.setChordStudioOpen,
    setChordStudioHeight: layout.setChordStudioHeight,
    toggleRhythmStudio: layout.toggleRhythmStudio,
    setRhythmStudioOpen: layout.setRhythmStudioOpen,
    setRhythmStudioHeight: layout.setRhythmStudioHeight,
    resetChordStudioHeight: layout.resetChordStudioHeight,
    resetRhythmStudioHeight: layout.resetRhythmStudioHeight,
    toggleArpStudio: layout.toggleArpStudio,
    setArpStudioOpen: layout.setArpStudioOpen,
    setArpStudioHeight: layout.setArpStudioHeight,
    resetArpStudioHeight: layout.resetArpStudioHeight,
    setLeftSidebarWidth: layout.setLeftSidebarWidth,
    resetLeftSidebarWidth: layout.resetLeftSidebarWidth,
    setRightSidebarWidth: layout.setRightSidebarWidth,
    resetRightSidebarWidth: layout.resetRightSidebarWidth,
    toggleVelocityLane: layout.toggleVelocityLane,
    setVelocityLane: layout.setVelocityLane,
    setVelocityLaneHeight: layout.setVelocityLaneHeight,
    resetVelocityLaneHeight: layout.resetVelocityLaneHeight
  }
})
