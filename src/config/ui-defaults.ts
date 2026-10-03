/**
 * ============================================================================
 * CENTRAL SOURCE OF TRUTH FOR ALL UI & LAYOUT DEFAULTS
 * ============================================================================
 * All default parameter values for canvas grid, tool preferences, docking,
 * dimensions, and module layouts MUST be defined exclusively in this file.
 *
 * Guidelines:
 * 1. NEVER hardcode dimensions, grid steps, or dock states across components or stores.
 * 2. Pinia stores (ui.store, module-layout.store) must initialize from these constants.
 * 3. Unit tests must assert against these constants to avoid breaking on UI balance changes.
 * ============================================================================
 */
import type {
  ActiveTool,
  ActiveTrack,
  CanvasGridBounds,
  CanvasGridDefaults,
  ExpressionModuleKey,
  GeneratorModuleKey,
  HeightDimensionConfig,
  HistoryContext,
  ModuleKey,
  ModuleOpenStates,
  SoundDockView,
  StudioDock,
  UiDimensionsConfig,
  UiPreferencesDefaults,
  WidthDimensionConfig
} from './config.types'

export type {
  ActiveTool,
  ActiveTrack,
  CanvasGridBounds,
  CanvasGridDefaults,
  ExpressionModuleKey,
  GeneratorModuleKey,
  HeightDimensionConfig,
  HistoryContext,
  ModuleKey,
  ModuleOpenStates,
  SoundDockView,
  StudioDock,
  UiDimensionsConfig,
  UiPreferencesDefaults,
  WidthDimensionConfig
}

export const UI_PREFERENCES_VERSION = 2

export const GENERATOR_PANEL_MODULE_KEYS = ['rhythm', 'motif', 'contour', 'variation', 'takes'] as const

export const EXPRESSION_PANEL_MODULE_KEYS = ['pitch', 'harmony', 'feel', 'analysis'] as const

export const CANVAS_GRID_BOUNDS: CanvasGridBounds = {
  minStepWidth: 8,
  maxStepWidth: 96,
  minRowHeight: 12,
  maxRowHeight: 36
} as const

export const WORK_RANGE_EDGE = {
  hitRadiusPx: 8,
  gripHitHeightPx: 24,
  gripTopPx: 8,
  gripWidthPx: 4,
  gripHeightPx: 12
} as const

export const DEFAULT_CANVAS_GRID: CanvasGridDefaults = {
  stepWidth: 24,
  rowHeight: 18,
  scrollX: 0,
  scrollY: 0
} as const

export const SNAP_GRID_STEPS = [1, 2, 4] as const
export const ARP_PREVIEW_BAR_WIDTH_PX = 192
export const DEFAULT_CHORD_PALETTE = {
  mode: 'triad' as const,
  selectedDegree: null as number | null
} as const
export const CHORD_GAP_SLOT = {
  insetPx: 2,
  labelMinWidthPx: 60
} as const
export const CHORD_TIMELINE_DRAG = {
  thresholdPx: 4,
  fineSnapMinBarWidth: 192,
  mediumSnapMinBarWidth: 96,
  fineSnapBars: 0.25,
  mediumSnapBars: 0.5,
  coarseSnapBars: 1
} as const
export const CHORD_PALETTE_DROP = {
  snapBars: 0.25
} as const
export const CHORD_TIMELINE_RESIZE = {
  snapBars: 0.25,
  minDurationBars: 0.25
} as const
export const DEFAULT_FOLLOW_PLAYHEAD = true
export const DEFAULT_SHOW_WELCOME_ON_STARTUP = false
export const DEFAULT_SOUND_DOCK_VIEW: SoundDockView = 'sound'

export const DEFAULT_UI_PREFERENCES: UiPreferencesDefaults = {
  activeTool: 'select',
  activeTrack: 'melody',
  snapStep: 1,
  isAuditionEnabled: false,
  isScaleLocked: true,
  returnToStartOnPause: true,
  playFromLoopStart: true,
  isLeftSidebarOpen: true,
  isRightSidebarOpen: true,
  activeStudioDock: null,
  soundDockView: DEFAULT_SOUND_DOCK_VIEW,
  isVelocityLaneOpen: false
} as const

export const DEFAULT_UI_DIMENSIONS: UiDimensionsConfig = {
  leftSidebar: {
    minWidth: 280,
    maxWidth: 420,
    defaultWidth: 280
  },
  rightSidebar: {
    minWidth: 280,
    maxWidth: 420,
    defaultWidth: 280
  },
  soundDock: {
    minHeight: 184,
    maxHeight: 480,
    defaultHeight: 352
  },
  chordStudio: {
    minHeight: 250,
    maxHeight: 480,
    defaultHeight: 350
  },
  rhythmStudio: {
    minHeight: 200,
    maxHeight: 480,
    defaultHeight: 260
  },
  arpStudio: {
    minHeight: 200,
    maxHeight: 480,
    defaultHeight: 300
  },
  velocityLane: {
    minHeight: 64,
    maxHeight: 360,
    defaultHeight: 90
  },
  minCenterViewportWidth: 680,
  minRollViewportHeight: 240
} as const

export const LEFT_SIDEBAR_MIN_WIDTH = DEFAULT_UI_DIMENSIONS.leftSidebar.minWidth
export const LEFT_SIDEBAR_MAX_WIDTH = DEFAULT_UI_DIMENSIONS.leftSidebar.maxWidth
export const LEFT_SIDEBAR_DEFAULT_WIDTH = DEFAULT_UI_DIMENSIONS.leftSidebar.defaultWidth

export const RIGHT_SIDEBAR_MIN_WIDTH = DEFAULT_UI_DIMENSIONS.rightSidebar.minWidth
export const RIGHT_SIDEBAR_MAX_WIDTH = DEFAULT_UI_DIMENSIONS.rightSidebar.maxWidth
export const RIGHT_SIDEBAR_DEFAULT_WIDTH = DEFAULT_UI_DIMENSIONS.rightSidebar.defaultWidth

export const SOUND_DOCK_MIN_HEIGHT = DEFAULT_UI_DIMENSIONS.soundDock.minHeight
export const SOUND_DOCK_MAX_HEIGHT = DEFAULT_UI_DIMENSIONS.soundDock.maxHeight
export const SOUND_DOCK_DEFAULT_HEIGHT = DEFAULT_UI_DIMENSIONS.soundDock.defaultHeight

export const CHORD_STUDIO_MIN_HEIGHT = DEFAULT_UI_DIMENSIONS.chordStudio.minHeight
export const CHORD_STUDIO_MAX_HEIGHT = DEFAULT_UI_DIMENSIONS.chordStudio.maxHeight
export const CHORD_STUDIO_DEFAULT_HEIGHT = DEFAULT_UI_DIMENSIONS.chordStudio.defaultHeight

export const RHYTHM_STUDIO_MIN_HEIGHT = DEFAULT_UI_DIMENSIONS.rhythmStudio.minHeight
export const RHYTHM_STUDIO_MAX_HEIGHT = DEFAULT_UI_DIMENSIONS.rhythmStudio.maxHeight
export const RHYTHM_STUDIO_DEFAULT_HEIGHT = DEFAULT_UI_DIMENSIONS.rhythmStudio.defaultHeight

export const ARP_STUDIO_MIN_HEIGHT = DEFAULT_UI_DIMENSIONS.arpStudio.minHeight
export const ARP_STUDIO_MAX_HEIGHT = DEFAULT_UI_DIMENSIONS.arpStudio.maxHeight
export const ARP_STUDIO_DEFAULT_HEIGHT = DEFAULT_UI_DIMENSIONS.arpStudio.defaultHeight
export const STUDIO_MIN_ROLL_HEIGHT = 400

export const VELOCITY_LANE_MIN_HEIGHT = DEFAULT_UI_DIMENSIONS.velocityLane.minHeight
export const VELOCITY_LANE_MAX_HEIGHT = DEFAULT_UI_DIMENSIONS.velocityLane.maxHeight
export const VELOCITY_LANE_DEFAULT_HEIGHT = DEFAULT_UI_DIMENSIONS.velocityLane.defaultHeight

export const MIN_CENTER_VIEWPORT_WIDTH = DEFAULT_UI_DIMENSIONS.minCenterViewportWidth
export const MIN_ROLL_VIEWPORT_HEIGHT = DEFAULT_UI_DIMENSIONS.minRollViewportHeight

export const DEFAULT_MODULE_LAYOUT: Readonly<Record<ModuleKey, boolean>> = {
  rhythm: true,
  motif: false,
  contour: false,
  variation: false,
  takes: false,
  pitch: false,
  harmony: false,
  feel: false,
  analysis: true
} as const
