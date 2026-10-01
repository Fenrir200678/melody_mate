import { calculateMaxScrollX, followNextStep, type FollowStepState } from './geometry'

/**
 * Accessors the follow-scroll machine needs from the host composable. Plain functions
 * instead of Vue refs keep this module framework-free and unit-testable.
 */
export interface PlayheadFollowDeps {
  getViewportWidth: () => number
  getStepWidth: () => number
  getKeyboardWidth: () => number
  getBars: () => number
  getScrollX: () => number
  setScrollX: (value: number) => void
  isFollowEnabled: () => boolean
}

export interface PlayheadFollow {
  /** Per-frame driver: smooth-follow the playhead or defer to manual user scrolling. */
  update: (playheadStep: number) => void
  /** Manual wheel/scrollbar/pan interaction during playback suspends follow until next play. */
  suspend: () => void
  /** Re-arm on every playback (re-)start, after any user scroll break. */
  rearm: (playheadStep: number) => void
}

export function createPlayheadFollow(deps: PlayheadFollowDeps): PlayheadFollow {
  let armed = true
  let primed = false
  let state: FollowStepState = { step: 0, scrollX: 0 }

  function update(playheadStep: number): void {
    const width = deps.getViewportWidth()

    if (!armed || !deps.isFollowEnabled()) {
      // Track but don't drive so a re-arm (next play / toggle) starts smoothly.
      state = { step: playheadStep, scrollX: deps.getScrollX() }
      return
    }

    // If another input source moved the view this frame, defer to the user and suspend.
    if (primed && Math.abs(deps.getScrollX() - state.scrollX) > 1) {
      armed = false
      state = { step: playheadStep, scrollX: deps.getScrollX() }
      return
    }

    const maxScroll = calculateMaxScrollX(width, deps.getStepWidth(), deps.getBars(), deps.getKeyboardWidth())
    state = followNextStep(state, playheadStep, {
      stepWidth: deps.getStepWidth(),
      viewportWidth: width,
      maxScrollX: maxScroll,
      keyboardWidth: deps.getKeyboardWidth()
    })
    primed = true

    if (Math.abs(state.scrollX - deps.getScrollX()) >= 0.5) {
      deps.setScrollX(state.scrollX)
    }
  }

  return {
    update,
    suspend: () => {
      armed = false
    },
    rearm: (playheadStep: number) => {
      armed = true
      primed = true
      state = { step: playheadStep, scrollX: deps.getScrollX() }
    }
  }
}
