import { toValue } from 'vue'
import { moveWorkRangeBySteps, resizeWorkRangeEdge, workRangeFromDrag } from '@/core/generator/work-range'
import { WORK_RANGE_EDGE } from '@/config/ui-defaults'
import { getChordHitAtPixel } from './chordOps'
import { pixelXToStep, stepToPixelX } from './geometry'
import { beginGesture, type GestureSession } from './gestureSession'
import type { PianoRollInteractionContext } from './interactionContext'
import { getNoteAtPixel, type ToolMode, type TransformOptions } from './noteOps'

/**
 * Empty-space routing: the Select tool claims empty space for the generation work range,
 * while the Lasso tool and the primary modifier (Cmd/Ctrl) draw a note marquee instead.
 */
export function resolveEmptySpaceGesture(input: {
  button: number
  tool: ToolMode
  empty: boolean
  modifier: boolean
  hasWorkRange: boolean
}): 'work-range' | 'lasso' | null {
  if (input.button !== 0 || !input.empty) return null
  if (input.modifier || input.tool === 'lasso') return 'lasso'
  return input.tool === 'select' && input.hasWorkRange ? 'work-range' : null
}

export function useWorkRangeGestures(ctx: PianoRollInteractionContext, session: GestureSession) {
  const { options, dragState } = ctx

  function edgeAt(mouseX: number, tf: TransformOptions): 'start' | 'end' | null {
    if (!options.workRange) return null
    const range = options.workRange.value
    const projectEnd = ctx.maxProjectStep.value
    if (range.startStep === 0 && range.endStep === projectEnd) return null
    const startX = stepToPixelX(range.startStep, tf.stepWidth, tf.scrollX, tf.keyboardWidth)
    const endX = stepToPixelX(range.endStep, tf.stepWidth, tf.scrollX, tf.keyboardWidth)
    const startDistance = startX >= tf.keyboardWidth ? Math.abs(mouseX - startX) : Infinity
    const endDistance = endX >= tf.keyboardWidth ? Math.abs(mouseX - endX) : Infinity
    if (Math.min(startDistance, endDistance) > WORK_RANGE_EDGE.hitRadiusPx) return null
    return startDistance <= endDistance ? 'start' : 'end'
  }

  function resizableEdgeAt(mouseX: number, mouseY: number, tf: TransformOptions): 'start' | 'end' | null {
    const edge = edgeAt(mouseX, tf)
    if (!edge) return null
    return mouseY <= WORK_RANGE_EDGE.gripHitHeightPx || isEmptyTrackHit(mouseX, mouseY, tf) ? edge : null
  }

  function canMoveAt(mouseX: number, tf: TransformOptions): boolean {
    if (!options.workRange) return false
    const range = options.workRange.value
    const projectEnd = ctx.maxProjectStep.value
    if (range.startStep === 0 && range.endStep === projectEnd) return false
    const step = pixelXToStep(mouseX, tf.stepWidth, tf.scrollX, tf.keyboardWidth)
    return step >= range.startStep && step < range.endStep
  }

  function isEmptyTrackHit(mouseX: number, mouseY: number, tf: TransformOptions): boolean {
    if (ctx.isChordTrack()) {
      return getChordHitAtPixel(mouseX, mouseY, ctx.currentChords(), tf, ctx.currentStepsPerBar()).zone === 'outside'
    }
    return getNoteAtPixel(mouseX, mouseY, ctx.currentNotes(), tf).zone === 'outside'
  }

  function start(canvas: HTMLCanvasElement, pointerId: number, mouseX: number, tf: TransformOptions): void {
    if (!options.workRange) return
    session.workRangeStartX = mouseX
    session.workRangeStartStep = pixelXToStep(mouseX, tf.stepWidth, tf.scrollX, tf.keyboardWidth)
    session.workRangeOriginal = options.workRange.value
    const edge = edgeAt(mouseX, tf)
    session.workRangeAction = edge ? `resize-${edge}` : canMoveAt(mouseX, tf) ? 'move' : 'create'
    session.workRangeChanged = false
    if (ctx.isChordTrack()) options.onUpdateSelectedChordNoteIds?.([])
    else options.onUpdateSelectedNoteIds([])
    beginGesture(dragState, canvas, pointerId, 'work-range')
  }

  function update(mouseX: number, tf: TransformOptions): void {
    if (Math.abs(mouseX - session.workRangeStartX) < 2 || !options.workRange) return
    if (session.workRangeAction !== 'create' && session.workRangeOriginal) {
      session.workRangeChanged = true
      const deltaSteps = Math.round((mouseX - session.workRangeStartX) / tf.stepWidth)
      const original = session.workRangeOriginal
      const next =
        session.workRangeAction === 'move'
          ? moveWorkRangeBySteps(original, deltaSteps, ctx.maxProjectStep.value)
          : resizeWorkRangeEdge(
              original,
              session.workRangeAction === 'resize-start' ? 'start' : 'end',
              (session.workRangeAction === 'resize-start' ? original.startStep : original.endStep) + deltaSteps,
              ctx.maxProjectStep.value
            )
      if (next.startStep !== options.workRange.value.startStep || next.endStep !== options.workRange.value.endStep) {
        options.onUpdateWorkRange?.(next)
        options.requestDraw?.()
      }
      return
    }
    const end = pixelXToStep(mouseX, tf.stepWidth, tf.scrollX, tf.keyboardWidth)
    const next = workRangeFromDrag(session.workRangeStartStep, end, toValue(options.snapStep), ctx.maxProjectStep.value)
    session.workRangeChanged = true
    options.onUpdateWorkRange?.(next)
    options.requestDraw?.()
  }

  function cancel(): void {
    if (session.workRangeChanged && session.workRangeOriginal) {
      options.onUpdateWorkRange?.(session.workRangeOriginal)
    }
  }

  function finishClick(mouseX: number, tf: TransformOptions): void {
    if (session.workRangeChanged || session.workRangeAction !== 'create' || !options.workRange) return
    const clickedStep = pixelXToStep(mouseX, tf.stepWidth, tf.scrollX, tf.keyboardWidth)
    const range = options.workRange.value
    const projectEnd = ctx.maxProjectStep.value
    const isOutsideRange = clickedStep < range.startStep || clickedStep >= range.endStep
    const isNarrowed = range.startStep > 0 || range.endStep < projectEnd
    if (isOutsideRange && isNarrowed) {
      options.onUpdateWorkRange?.({ startStep: 0, endStep: projectEnd })
      options.requestDraw?.()
    }
  }

  return { canMoveAt, cancel, finishClick, isEmptyTrackHit, resizableEdgeAt, start, update }
}
