import { toValue, type ComputedRef, type Ref } from 'vue'
import type { ChordEvent } from '@/core/schemas/chord.schema'
import type { AppNote } from '@/core/schemas/note.schema'
import {
  calculateContentPitchBounds,
  calculateFitLoop,
  calculateHorizontalZoom,
  calculateSmartPitchFit,
  calculateVerticalZoom,
  DEFAULT_ROW_HEIGHT,
  DEFAULT_STEP_WIDTH,
  MAX_ROW_HEIGHT,
  MAX_STEP_WIDTH,
  MIN_ROW_HEIGHT,
  MIN_STEP_WIDTH
} from './zoomOps'

export interface UsePianoRollZoomOptions {
  stepWidth: Ref<number>
  rowHeight: Ref<number>
  scrollX: Ref<number>
  scrollY: Ref<number>
  viewportWidth: Ref<number>
  viewportHeight: Ref<number>
  keyboardWidth: Ref<number>
  minMidi: Ref<number>
  maxMidi: Ref<number>
  bars: Ref<number> | ComputedRef<number>
  notes: Ref<AppNote[]> | ComputedRef<AppNote[]>
  chords?: Ref<ChordEvent[]> | ComputedRef<ChordEvent[]>
  loopStartStep: Ref<number>
  loopEndStep: Ref<number>
  requestDraw: () => void
  onSuspendFollow?: () => void
}

export function usePianoRollZoom(options: UsePianoRollZoomOptions) {
  function zoomInHorizontal(): void {
    options.onSuspendFollow?.()
    options.stepWidth.value = Math.min(MAX_STEP_WIDTH, options.stepWidth.value + 4)
    options.requestDraw()
  }

  function zoomOutHorizontal(): void {
    options.onSuspendFollow?.()
    options.stepWidth.value = Math.max(MIN_STEP_WIDTH, options.stepWidth.value - 4)
    options.requestDraw()
  }

  function zoomInVertical(): void {
    options.rowHeight.value = Math.min(MAX_ROW_HEIGHT, options.rowHeight.value + 2)
    options.requestDraw()
  }

  function zoomOutVertical(): void {
    options.rowHeight.value = Math.max(MIN_ROW_HEIGHT, options.rowHeight.value - 2)
    options.requestDraw()
  }

  function fitLoop(): void {
    options.onSuspendFollow?.()
    const fit = calculateFitLoop({
      viewportWidth: options.viewportWidth.value,
      keyboardWidth: options.keyboardWidth.value,
      loopStartStep: options.loopStartStep.value,
      loopEndStep: options.loopEndStep.value,
      bars: toValue(options.bars)
    })
    options.stepWidth.value = fit.stepWidth
    options.scrollX.value = fit.scrollX
    options.requestDraw()
  }

  function fitHeight(): void {
    const fit = calculateSmartPitchFit({
      viewportHeight: options.viewportHeight.value,
      notes: toValue(options.notes),
      chords: toValue(options.chords),
      minMidi: options.minMidi.value,
      maxMidi: options.maxMidi.value,
      currentRowHeight: options.rowHeight.value,
      defaultRowHeight: DEFAULT_ROW_HEIGHT
    })

    options.rowHeight.value = fit.rowHeight
    options.scrollY.value = fit.scrollY
    options.requestDraw()
  }

  function resetZoom(): void {
    options.onSuspendFollow?.()
    options.stepWidth.value = DEFAULT_STEP_WIDTH
    options.rowHeight.value = DEFAULT_ROW_HEIGHT

    // Center viewport vertically around notes or middle C
    const bounds = calculateContentPitchBounds(toValue(options.notes), toValue(options.chords))
    const centerMidi = bounds ? Math.round((bounds.minMidi + bounds.maxMidi) / 2) : 60
    const targetRow = options.maxMidi.value - centerMidi
    const centerOffset = options.viewportHeight.value / (2 * DEFAULT_ROW_HEIGHT)
    const desiredScrollRow = Math.max(0, targetRow - centerOffset)
    const totalContentHeight = (options.maxMidi.value - options.minMidi.value + 1) * DEFAULT_ROW_HEIGHT
    const maxScrollY = Math.max(0, totalContentHeight - options.viewportHeight.value)
    options.scrollY.value = Math.max(0, Math.min(maxScrollY, Math.round(desiredScrollRow * DEFAULT_ROW_HEIGHT)))

    options.requestDraw()
  }

  /**
   * Handles wheel zoom events. Returns true if the wheel event was consumed as a zoom action.
   */
  function handleWheelZoom(e: WheelEvent): boolean {
    const isOverKeyboard = e.offsetX < options.keyboardWidth.value
    const isVerticalZoomModifier = e.ctrlKey || e.metaKey || (e.altKey && e.shiftKey)

    if (isOverKeyboard || isVerticalZoomModifier) {
      // Vertical zoom
      const res = calculateVerticalZoom({
        deltaY: e.deltaY,
        oldRowHeight: options.rowHeight.value,
        mouseY: e.offsetY,
        scrollY: options.scrollY.value,
        maxMidi: options.maxMidi.value,
        minMidi: options.minMidi.value,
        viewportHeight: options.viewportHeight.value
      })

      if (res.newRowHeight !== options.rowHeight.value || res.newScrollY !== options.scrollY.value) {
        options.rowHeight.value = res.newRowHeight
        options.scrollY.value = res.newScrollY
        options.requestDraw()
      }
      return true
    }

    if (e.altKey) {
      // Horizontal zoom
      options.onSuspendFollow?.()
      const res = calculateHorizontalZoom({
        deltaY: e.deltaY,
        oldStepWidth: options.stepWidth.value,
        mouseX: e.offsetX,
        scrollX: options.scrollX.value,
        keyboardWidth: options.keyboardWidth.value,
        viewportWidth: options.viewportWidth.value,
        bars: toValue(options.bars)
      })

      if (res.newStepWidth !== options.stepWidth.value || res.newScrollX !== options.scrollX.value) {
        options.stepWidth.value = res.newStepWidth
        options.scrollX.value = res.newScrollX
        options.requestDraw()
      }
      return true
    }

    return false
  }

  return {
    zoomInHorizontal,
    zoomOutHorizontal,
    zoomInVertical,
    zoomOutVertical,
    fitLoop,
    fitHeight,
    resetZoom,
    handleWheelZoom
  }
}
