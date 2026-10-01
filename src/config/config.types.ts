/**
 * ============================================================================
 * CONFIGURATION TYPES & INTERFACES
 * ============================================================================
 * Shared TypeScript types and interfaces for application defaults,
 * generator parameters, project settings, audio assignments, and UI layout.
 * ============================================================================
 */

import type { MutationAxes } from '../core/variation/types'

// ----------------------------------------------------------------------------
// Core & Audio Defaults Types
// ----------------------------------------------------------------------------

export interface VariationSettings {
  readonly variationMode: 'mutate' | 'transform'
  readonly mutationAxes: MutationAxes
  readonly mutationStrength: number
  readonly keepOriginalAsTake: boolean
}

// ----------------------------------------------------------------------------
// UI & Layout Defaults Types
// ----------------------------------------------------------------------------

export type ActiveTool = 'select' | 'lasso' | 'pencil' | 'eraser' | 'pan'
export type ActiveTrack = 'melody' | 'chords'
export type StudioDock = 'chord' | 'rhythm' | 'arp' | null
export type HistoryContext = 'piano' | 'chord' | 'rhythm'

export type GeneratorModuleKey = 'rhythm' | 'motif' | 'contour' | 'variation' | 'takes'
export type ExpressionModuleKey = 'pitch' | 'harmony' | 'feel' | 'analysis'
export type ModuleKey = GeneratorModuleKey | ExpressionModuleKey
export type ModuleOpenStates = Record<string, boolean>

export interface CanvasGridDefaults {
  readonly stepWidth: number
  readonly rowHeight: number
  readonly scrollX: number
  readonly scrollY: number
}

export interface CanvasGridBounds {
  readonly minStepWidth: number
  readonly maxStepWidth: number
  readonly minRowHeight: number
  readonly maxRowHeight: number
}

export interface UiPreferencesDefaults {
  readonly activeTool: ActiveTool
  readonly activeTrack: ActiveTrack
  readonly snapStep: number
  readonly isAuditionEnabled: boolean
  readonly isScaleLocked: boolean
  readonly returnToStartOnPause: boolean
  readonly playFromLoopStart: boolean
  readonly isLeftSidebarOpen: boolean
  readonly isRightSidebarOpen: boolean
  readonly isSoundDockOpen: boolean
  readonly activeStudioDock: StudioDock
  readonly isVelocityLaneOpen: boolean
}

export interface WidthDimensionConfig {
  readonly minWidth: number
  readonly maxWidth: number
  readonly defaultWidth: number
}

export interface HeightDimensionConfig {
  readonly minHeight: number
  readonly maxHeight: number
  readonly defaultHeight: number
}

export interface UiDimensionsConfig {
  readonly leftSidebar: WidthDimensionConfig
  readonly rightSidebar: WidthDimensionConfig
  readonly soundDock: HeightDimensionConfig
  readonly chordStudio: HeightDimensionConfig
  readonly rhythmStudio: HeightDimensionConfig
  readonly arpStudio: HeightDimensionConfig
  readonly velocityLane: HeightDimensionConfig
  readonly minCenterViewportWidth: number
  readonly minRollViewportHeight: number
}
