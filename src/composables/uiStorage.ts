import {
  type StudioDock,
  LEFT_SIDEBAR_MAX_WIDTH,
  LEFT_SIDEBAR_MIN_WIDTH,
  MIN_CENTER_VIEWPORT_WIDTH,
  MIN_ROLL_VIEWPORT_HEIGHT,
  RIGHT_SIDEBAR_MAX_WIDTH,
  RIGHT_SIDEBAR_MIN_WIDTH,
  UI_PREFERENCES_VERSION,
  VELOCITY_LANE_MAX_HEIGHT,
  VELOCITY_LANE_MIN_HEIGHT
} from '../config/ui-defaults'

export const UI_STORAGE_KEY = 'melodymate-ui-preferences'

export interface PersistedUiPreferences {
  version?: number
  isLeftSidebarOpen?: boolean
  isRightSidebarOpen?: boolean
  activeStudioDock?: StudioDock
  rhythmStudioHeight?: number
  arpStudioHeight?: number
  leftSidebarWidth?: number
  rightSidebarWidth?: number
  soundDockHeight?: number
  chordStudioHeight?: number
  isVelocityLaneOpen?: boolean
  velocityLaneHeight?: number
  showWelcomeOnStartup?: boolean
  hasSeenWelcome?: boolean
}

export function readUiPreferences(): PersistedUiPreferences | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(UI_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedUiPreferences
    if (!parsed || typeof parsed !== 'object' || parsed.version !== UI_PREFERENCES_VERSION) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveUiPreferences(preferences: PersistedUiPreferences): void {
  if (typeof window === 'undefined') return
  try {
    const existing = readUiPreferences() ?? {}
    window.localStorage.setItem(
      UI_STORAGE_KEY,
      JSON.stringify({ ...existing, ...preferences, version: UI_PREFERENCES_VERSION })
    )
  } catch {
    // UI preferences remain usable when browser storage is unavailable.
  }
}

export function resolveMaxVelocityLaneHeight(): number {
  if (typeof window === 'undefined' || typeof window.innerHeight !== 'number') return VELOCITY_LANE_MAX_HEIGHT
  const available = window.innerHeight - MIN_ROLL_VIEWPORT_HEIGHT
  return Math.max(VELOCITY_LANE_MIN_HEIGHT, Math.min(VELOCITY_LANE_MAX_HEIGHT, available))
}

export function resolveMaxLeftSidebarWidth(currentRightWidth: number): number {
  if (typeof window === 'undefined' || typeof window.innerWidth !== 'number') return LEFT_SIDEBAR_MAX_WIDTH
  const available = window.innerWidth - currentRightWidth - MIN_CENTER_VIEWPORT_WIDTH
  return Math.max(LEFT_SIDEBAR_MIN_WIDTH, Math.min(LEFT_SIDEBAR_MAX_WIDTH, available))
}

export function resolveMaxRightSidebarWidth(currentLeftWidth: number): number {
  if (typeof window === 'undefined' || typeof window.innerWidth !== 'number') return RIGHT_SIDEBAR_MAX_WIDTH
  const available = window.innerWidth - currentLeftWidth - MIN_CENTER_VIEWPORT_WIDTH
  return Math.max(RIGHT_SIDEBAR_MIN_WIDTH, Math.min(RIGHT_SIDEBAR_MAX_WIDTH, available))
}

export function isWideViewport(): boolean {
  return typeof window === 'undefined' || window.innerWidth >= 1280
}
