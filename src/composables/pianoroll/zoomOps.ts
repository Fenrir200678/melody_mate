import { DEFAULT_CANVAS_GRID, CANVAS_GRID_BOUNDS } from '@/config/ui-defaults'
import { pitchToMidi } from '@/core/theory/scale.engine'
import { calculateMaxScrollX, midiToPixelY, pixelYToMidi } from './geometry'

export const DEFAULT_STEP_WIDTH = DEFAULT_CANVAS_GRID.stepWidth
export const DEFAULT_ROW_HEIGHT = DEFAULT_CANVAS_GRID.rowHeight
export const MIN_ROW_HEIGHT = 10
export const MAX_ROW_HEIGHT = 64
export const MIN_STEP_WIDTH = CANVAS_GRID_BOUNDS.minStepWidth
export const MAX_STEP_WIDTH = CANVAS_GRID_BOUNDS.maxStepWidth

export interface PitchRange {
  minMidi: number
  maxMidi: number
}

/**
 * Extracts the bounding MIDI pitch range from notes and chord voicings.
 * Returns null if no musical events are present.
 */
export function calculateContentPitchBounds(
  notes: readonly { midi: number }[],
  chords?: readonly { voicing?: readonly string[] }[]
): PitchRange | null {
  let min = Infinity
  let max = -Infinity

  for (const n of notes) {
    if (n.midi < min) min = n.midi
    if (n.midi > max) max = n.midi
  }

  if (chords) {
    for (const c of chords) {
      if (!c.voicing) continue
      for (const p of c.voicing) {
        const midi = pitchToMidi(p)
        if (midi < min) min = midi
        if (midi > max) max = midi
      }
    }
  }

  if (min === Infinity || max === -Infinity) {
    return null
  }

  return { minMidi: min, maxMidi: max }
}

/**
 * Calculates vertical zoom centered on the mouse pointer.
 * Ensures the MIDI note under the cursor stays fixed in screen space.
 */
export function calculateVerticalZoom(params: {
  deltaY: number
  oldRowHeight: number
  mouseY: number
  scrollY: number
  maxMidi: number
  minMidi: number
  viewportHeight: number
  factor?: number
}): { newRowHeight: number; newScrollY: number } {
  const zoomFactor = params.factor ?? (params.deltaY < 0 ? 1.15 : 0.87)
  const newRowHeight = Math.max(MIN_ROW_HEIGHT, Math.min(MAX_ROW_HEIGHT, Math.round(params.oldRowHeight * zoomFactor)))

  if (newRowHeight === params.oldRowHeight) {
    return { newRowHeight: params.oldRowHeight, newScrollY: params.scrollY }
  }

  // Anchor to the MIDI note under the mouse cursor
  const mouseMidi = pixelYToMidi(params.mouseY, params.oldRowHeight, params.scrollY, params.maxMidi)
  const newMouseY = midiToPixelY(mouseMidi, newRowHeight, 0, params.maxMidi)
  const totalContentHeight = (params.maxMidi - params.minMidi + 1) * newRowHeight
  const maxScrollY = Math.max(0, totalContentHeight - params.viewportHeight)
  const newScrollY = Math.max(0, Math.min(maxScrollY, Math.round(newMouseY - params.mouseY)))

  return { newRowHeight, newScrollY }
}

/**
 * Calculates horizontal zoom centered on the mouse pointer.
 */
export function calculateHorizontalZoom(params: {
  deltaY: number
  oldStepWidth: number
  mouseX: number
  scrollX: number
  keyboardWidth: number
  viewportWidth: number
  bars: number
  factor?: number
}): { newStepWidth: number; newScrollX: number } {
  const zoomFactor = params.factor ?? (params.deltaY < 0 ? 1.15 : 0.87)
  const newStepWidth = Math.max(MIN_STEP_WIDTH, Math.min(MAX_STEP_WIDTH, Math.round(params.oldStepWidth * zoomFactor)))

  if (newStepWidth === params.oldStepWidth) {
    return { newStepWidth: params.oldStepWidth, newScrollX: params.scrollX }
  }

  const mouseStep = (params.mouseX - params.keyboardWidth + params.scrollX) / params.oldStepWidth
  const targetScrollX = Math.round(mouseStep * newStepWidth - (params.mouseX - params.keyboardWidth))
  const maxScrollX = calculateMaxScrollX(params.viewportWidth, newStepWidth, params.bars, params.keyboardWidth)
  const newScrollX = Math.max(0, Math.min(maxScrollX, targetScrollX))

  return { newStepWidth, newScrollX }
}

/**
 * Calculates a content-aware pitch fit for the viewport height.
 * If notes exist, frames them with a ±2 semitone margin (min 1 octave).
 * If already fitted (or less than default), toggles back to the default row height.
 */
export function calculateSmartPitchFit(params: {
  viewportHeight: number
  notes: readonly { midi: number }[]
  chords?: readonly { voicing?: readonly string[] }[]
  minMidi: number
  maxMidi: number
  currentRowHeight: number
  defaultRowHeight?: number
}): { rowHeight: number; scrollY: number; isToggledToDefault: boolean } {
  const defaultHeight = params.defaultRowHeight ?? DEFAULT_ROW_HEIGHT

  // Toggle behavior: if already fitted to content (or squashed < 14px), restore default height
  if (Math.abs(params.currentRowHeight - defaultHeight) > 1 && params.currentRowHeight !== defaultHeight) {
    const isFittedOrCompressed = params.currentRowHeight < defaultHeight || params.currentRowHeight > defaultHeight + 6
    if (isFittedOrCompressed) {
      // Calculate scroll to center existing content or middle C at default height
      const bounds = calculateContentPitchBounds(params.notes, params.chords)
      const centerMidi = bounds ? Math.round((bounds.minMidi + bounds.maxMidi) / 2) : 60
      const targetRow = params.maxMidi - centerMidi
      const centerOffset = params.viewportHeight / (2 * defaultHeight)
      const desiredScrollRow = Math.max(0, targetRow - centerOffset)
      const totalContentHeight = (params.maxMidi - params.minMidi + 1) * defaultHeight
      const maxScrollY = Math.max(0, totalContentHeight - params.viewportHeight)
      const scrollY = Math.max(0, Math.min(maxScrollY, Math.round(desiredScrollRow * defaultHeight)))

      return { rowHeight: defaultHeight, scrollY, isToggledToDefault: true }
    }
  }

  const bounds = calculateContentPitchBounds(params.notes, params.chords)
  const paddingSemis = 2

  let frameMin: number
  let frameMax: number

  if (bounds) {
    frameMin = Math.max(params.minMidi, bounds.minMidi - paddingSemis)
    frameMax = Math.min(params.maxMidi, bounds.maxMidi + paddingSemis)
    // Ensure at least 1 octave span for musical context
    if (frameMax - frameMin < 12) {
      const padNeeded = 12 - (frameMax - frameMin)
      frameMin = Math.max(params.minMidi, frameMin - Math.floor(padNeeded / 2))
      frameMax = Math.min(params.maxMidi, frameMax + Math.ceil(padNeeded / 2))
    }
  } else {
    // Default 2-octave framing (C3: 48 to C5: 72) when no notes exist
    frameMin = Math.max(params.minMidi, 48)
    frameMax = Math.min(params.maxMidi, 72)
  }

  const spanRows = Math.max(1, frameMax - frameMin + 1)
  const fittedRowHeight = Math.max(
    MIN_ROW_HEIGHT,
    Math.min(MAX_ROW_HEIGHT, Math.floor(params.viewportHeight / spanRows))
  )

  // Scroll to frameMin..frameMax cleanly
  const topRow = params.maxMidi - frameMax
  const totalContentHeight = (params.maxMidi - params.minMidi + 1) * fittedRowHeight
  const maxScrollY = Math.max(0, totalContentHeight - params.viewportHeight)
  const scrollY = Math.max(0, Math.min(maxScrollY, Math.round(topRow * fittedRowHeight)))

  return { rowHeight: fittedRowHeight, scrollY, isToggledToDefault: false }
}

/**
 * Calculates step width and scroll offset to fit the active loop region horizontally.
 */
export function calculateFitLoop(params: {
  viewportWidth: number
  keyboardWidth: number
  loopStartStep: number
  loopEndStep: number
  bars: number
}): { stepWidth: number; scrollX: number } {
  const timelineWidth = params.viewportWidth - params.keyboardWidth
  const loopSteps = Math.max(1, params.loopEndStep - params.loopStartStep)
  if (timelineWidth <= 0) {
    return { stepWidth: DEFAULT_STEP_WIDTH, scrollX: 0 }
  }

  const stepWidth = Math.max(MIN_STEP_WIDTH, Math.min(MAX_STEP_WIDTH, Math.floor(timelineWidth / loopSteps)))
  const targetScrollX = params.loopStartStep * stepWidth
  const maxScrollX = calculateMaxScrollX(params.viewportWidth, stepWidth, params.bars, params.keyboardWidth)
  const scrollX = Math.max(0, Math.min(maxScrollX, targetScrollX))

  return { stepWidth, scrollX }
}
