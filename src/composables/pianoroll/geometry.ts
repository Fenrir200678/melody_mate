export interface ViewportBounds {
  startStep: number
  endStep: number
  minMidi: number
  maxMidi: number
}

export interface FollowStepState {
  step: number
  scrollX: number
}

/**
 * Normalizes and configures an HTML5 canvas for crisp High-DPI / Retina rendering.
 */
export function setupCanvasDpi(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): { ctx: CanvasRenderingContext2D | null; dpr: number } {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.scale(dpr, dpr)
  }
  return { ctx, dpr }
}

/**
 * Calculates the maximum allowable horizontal scroll offset (scrollX).
 * If the project's bar content (plus keyboard) fits within the canvas viewport width,
 * returns 0 to prevent scrolling past the beginning into empty space.
 * Otherwise, returns the offset needed so the end of the last bar aligns exactly with the viewport right edge.
 */
export function calculateMaxScrollX(
  canvasWidth: number,
  stepWidth: number,
  bars: number,
  keyboardWidth: number
): number {
  if (canvasWidth <= 0 || stepWidth <= 0 || bars <= 0) return 0
  const totalBarWidth = bars * 16 * stepWidth
  const totalProjectWidth = keyboardWidth + totalBarWidth
  return Math.max(0, Math.round(totalProjectWidth - canvasWidth))
}

/**
 * Maps a musical step index to a pixel X coordinate on the canvas.
 */
export function stepToPixelX(step: number, stepWidth: number, scrollX: number, keyboardWidth: number): number {
  return keyboardWidth + step * stepWidth - scrollX
}

/**
 * Maps a pixel X coordinate back to a musical step index with optional grid snapping.
 */
export function pixelXToStep(
  x: number,
  stepWidth: number,
  scrollX: number,
  keyboardWidth: number,
  snapStep = 0
): number {
  if (stepWidth <= 0) return 0
  const rawStep = (x - keyboardWidth + scrollX) / stepWidth
  if (snapStep > 0) {
    const snapped = Math.round(rawStep / snapStep) * snapStep
    return Math.max(0, Math.round(snapped * 10000) / 10000)
  }
  return Math.max(0, rawStep)
}

/**
 * Snaps a raw step position to the nearest grid subdivision.
 */
export function snapStepToGrid(step: number, snapStep: number): number {
  if (snapStep <= 0) return Math.max(0, step)
  const snapped = Math.round(step / snapStep) * snapStep
  return Math.max(0, Math.round(snapped * 10000) / 10000)
}

/**
 * Maps a MIDI pitch number to a vertical pixel Y coordinate.
 */
export function midiToPixelY(midi: number, rowHeight: number, scrollY: number, maxMidi: number): number {
  return (maxMidi - midi) * rowHeight - scrollY
}

/**
 * Maps a pixel Y coordinate to the corresponding MIDI pitch number.
 */
export function pixelYToMidi(y: number, rowHeight: number, scrollY: number, maxMidi: number): number {
  if (rowHeight <= 0) return maxMidi
  const row = Math.floor((y + scrollY) / rowHeight)
  return Math.max(0, Math.min(127, maxMidi - row))
}

/**
 * Evaluates whether a note rectangle intersects the active visible viewport (Frustum Culling).
 */
export function isNoteInViewport(
  note: { step: number; durationSteps: number; midi: number },
  bounds: ViewportBounds
): boolean {
  const noteEndStep = note.step + note.durationSteps
  const isHorizontallyVisible = noteEndStep >= bounds.startStep && note.step <= bounds.endStep
  const isVerticallyVisible = note.midi >= bounds.minMidi && note.midi <= bounds.maxMidi
  return isHorizontallyVisible && isVerticallyVisible
}

/**
 * Calculates current visible bounds in musical steps and MIDI numbers.
 */
export function getViewportBounds(
  width: number,
  height: number,
  stepWidth: number,
  rowHeight: number,
  scrollX: number,
  scrollY: number,
  keyboardWidth: number,
  maxMidi: number
): ViewportBounds {
  const startStep = pixelXToStep(keyboardWidth, stepWidth, scrollX, keyboardWidth, 0)
  const endStep = pixelXToStep(width, stepWidth, scrollX, keyboardWidth, 0)
  const minMidi = pixelYToMidi(height, rowHeight, scrollY, maxMidi)
  const maxMidiVisible = pixelYToMidi(0, rowHeight, scrollY, maxMidi)

  return {
    startStep,
    endStep,
    minMidi,
    maxMidi: maxMidiVisible
  }
}

/**
 * Frame-step of the playhead-follow state machine: keeps the playhead centered inside
 * the visible timeline, smoothing per frame (lerp) but hard-snapping on backwards
 * jumps (loop wrap / seek) and freezing sub-pixel drift. Pure so it can be
 * unit-tested without a canvas mount. Reuses the state object when nothing moves.
 */
export function followNextStep(
  state: FollowStepState,
  playheadStep: number,
  params: { stepWidth: number; viewportWidth: number; maxScrollX: number; keyboardWidth: number; lerp?: number }
): FollowStepState {
  const visibleTrackWidth = Math.max(0, params.viewportWidth - params.keyboardWidth)
  const target = Math.max(0, Math.min(params.maxScrollX, playheadStep * params.stepWidth - visibleTrackWidth * 0.5))
  const backwardJump = playheadStep < state.step - 1e-6
  const diff = target - state.scrollX

  const lerp = params.lerp ?? 0.12
  const nextScrollX = backwardJump ? target : Math.max(0, Math.min(params.maxScrollX, state.scrollX + diff * lerp))

  // Skip reactive writes while the playhead step is constant and no pixel actually moves
  if (playheadStep === state.step && Math.abs(nextScrollX - state.scrollX) < 0.5) {
    return state
  }

  return { step: playheadStep, scrollX: nextScrollX }
}
