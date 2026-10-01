import { toValue } from 'vue'
import type { AppNote } from '@/core/schemas/note.schema'
import { midiToPitch } from '@/core/theory/scale.engine'
import { calculateMaxScrollX, pixelYToMidi } from './geometry'
import {
  calculatePanScroll,
  detectZone,
  getNoteAtPixel,
  resolveKeyboardKeyTooltip,
  type TransformOptions
} from './noteOps'
import { beginGesture, createGestureSession, resetGestureSession } from './gestureSession'
import { createPianoRollInteractionContext, type UsePianoRollInteractionsOptions } from './interactionContext'
import { isChordDragMode, useChordGestures } from './useChordGestures'
import { useNoteGestures } from './useNoteGestures'
import { resolveEmptySpaceGesture, useWorkRangeGestures } from './useWorkRangeGestures'
import { usePianoRollCanvasEvents } from './usePianoRollCanvasEvents'

export type { UsePianoRollInteractionsOptions } from './interactionContext'

/**
 * Composable orchestrating DAW mouse gestures, hit testing, dragging, and smart tool modes.
 *
 * This module owns only canvas lifecycle wiring and gesture routing (pan vs. melody vs.
 * chord track); the per-track behaviour lives in ./useNoteGestures and ./useChordGestures,
 * backed by the shared scratch state in ./gestureSession and the resolved options view
 * in ./interactionContext.
 *
 * Drag tracking relies on the Pointer Capture API on the canvas element, so no temporary
 * window-level pointermove/pointerup listeners are attached during gestures.
 */
export function usePianoRollInteractions(options: UsePianoRollInteractionsOptions) {
  const ctx = createPianoRollInteractionContext(options)
  const session = createGestureSession(ctx.dragState)
  const noteGestures = useNoteGestures(ctx, session)
  const chordGestures = useChordGestures(ctx, session)
  const workRangeGestures = useWorkRangeGestures(ctx, session)
  const { dragState } = ctx

  function handlePanMove(e: PointerEvent, canvas: HTMLCanvasElement, tf: TransformOptions): void {
    const deltaClientX = e.clientX - session.panStartX
    const deltaClientY = e.clientY - session.panStartY

    const cWidth = parseFloat(canvas.style.width) || canvas.width || 800
    const cHeight = parseFloat(canvas.style.height) || canvas.height || 600

    const curBars = toValue(options.bars) ?? 4
    const maxScrollX = calculateMaxScrollX(cWidth, tf.stepWidth, curBars, tf.keyboardWidth)

    const totalRows = toValue(options.maxMidi) - toValue(options.minMidi) + 1
    const maxScrollY = Math.max(0, totalRows * tf.rowHeight - cHeight)

    const next = calculatePanScroll(
      session.panStartScrollX,
      session.panStartScrollY,
      deltaClientX,
      deltaClientY,
      maxScrollX,
      maxScrollY
    )
    options.scrollX.value = next.scrollX
    options.scrollY.value = next.scrollY

    options.requestDraw?.()
  }

  function handleDragMove(
    e: PointerEvent,
    canvas: HTMLCanvasElement,
    mouseX: number,
    mouseY: number,
    tf: TransformOptions
  ): void {
    const mode = dragState.value.mode

    if (mode === 'work-range') {
      workRangeGestures.update(mouseX, tf)
      return
    }

    if (mode === 'pan') {
      handlePanMove(e, canvas, tf)
      return
    }

    if (isChordDragMode(mode)) {
      chordGestures.handleChordDragMove(e, mouseX, mouseY, tf, mode)
      return
    }

    noteGestures.handleNoteDragMove(e, mouseX, mouseY, tf)
  }

  function handleHover(canvas: HTMLCanvasElement, mouseX: number, mouseY: number, tf: TransformOptions): void {
    if (mouseX < tf.keyboardWidth) {
      canvas.style.cursor = 'pointer'
      const tooltip = resolveKeyboardKeyTooltip(
        mouseY,
        {
          rowHeight: tf.rowHeight,
          scrollY: tf.scrollY,
          minMidi: toValue(options.minMidi),
          maxMidi: toValue(options.maxMidi)
        },
        toValue(options.rootKey),
        toValue(options.scale)
      )
      const nextTitle = tooltip ?? ''
      if (canvas.title !== nextTitle) {
        canvas.title = nextTitle
      }
      return
    }

    if (canvas.title !== '') {
      canvas.title = ''
    }

    const tool = toValue(options.activeTool)

    if (tool === 'pan') {
      canvas.style.cursor = 'grab'
      return
    }

    if (tool === 'select' && workRangeGestures.resizableEdgeAt(mouseX, mouseY, tf)) {
      canvas.style.cursor = 'ew-resize'
      return
    }
    if (
      tool === 'select' &&
      workRangeGestures.canMoveAt(mouseX, tf) &&
      workRangeGestures.isEmptyTrackHit(mouseX, mouseY, tf)
    ) {
      canvas.style.cursor = 'grab'
      return
    }

    if (ctx.isChordTrack()) {
      chordGestures.handleChordHover(canvas, mouseX, mouseY, tf)
      return
    }

    noteGestures.handleNoteHover(canvas, mouseX, mouseY, tf)
  }

  function handlePointerMove(e: PointerEvent): void {
    if (session.pointerId !== null && e.pointerId !== session.pointerId) return
    const canvas = options.canvasRef.value
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const tf = ctx.getTransformOptions()

    if (dragState.value.isDragging) {
      if (canvas.title !== '') {
        canvas.title = ''
      }
      handleDragMove(e, canvas, mouseX, mouseY, tf)
      return
    }

    handleHover(canvas, mouseX, mouseY, tf)
  }

  function handlePointerLeave(): void {
    const canvas = options.canvasRef.value
    if (canvas && canvas.title !== '') {
      canvas.title = ''
    }
  }

  function handlePointerDown(e: PointerEvent): void {
    if (session.pointerId !== null) return
    const canvas = options.canvasRef.value
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const tf = ctx.getTransformOptions()
    const tool = toValue(options.activeTool)

    // Middle-mouse drag (any tool) or Left-click with Pan/Hand tool
    const isMiddleMouse = e.button === 1
    const isPanToolLeftClick = e.button === 0 && tool === 'pan'
    if (isMiddleMouse || isPanToolLeftClick) {
      e.preventDefault()
      session.panStartX = e.clientX
      session.panStartY = e.clientY
      session.panStartScrollX = toValue(options.scrollX)
      session.panStartScrollY = toValue(options.scrollY)

      beginGesture(dragState, canvas, e.pointerId, 'pan')
      session.pointerId = e.pointerId
      canvas.style.cursor = 'grabbing'
      return
    }

    // Keyboard Audition Click
    if (mouseX < tf.keyboardWidth) {
      const midi = pixelYToMidi(mouseY, tf.rowHeight, tf.scrollY, tf.maxMidi)
      options.onKeyFlash?.(midi)
      if (!ctx.isChordTrack()) {
        ctx.triggerAudition(midiToPitch(midi))
      }
      return
    }

    const edgeGripHit =
      tool === 'select' && !(e.metaKey || e.ctrlKey) && workRangeGestures.resizableEdgeAt(mouseX, mouseY, tf)
    const emptyTrackHit = Boolean(edgeGripHit) || workRangeGestures.isEmptyTrackHit(mouseX, mouseY, tf)
    const emptyGesture = resolveEmptySpaceGesture({
      button: e.button,
      tool,
      empty: emptyTrackHit,
      modifier: e.metaKey || e.ctrlKey,
      hasWorkRange: !!options.workRange
    })
    const forceLasso = emptyGesture === 'lasso'
    const startsWorkRange = emptyGesture === 'work-range'

    if (startsWorkRange) {
      workRangeGestures.start(canvas, e.pointerId, mouseX, tf)
      session.pointerId = e.pointerId
      canvas.style.cursor =
        session.workRangeAction === 'move'
          ? 'grabbing'
          : session.workRangeAction === 'create'
            ? 'crosshair'
            : 'ew-resize'
      return
    }

    if (ctx.isChordTrack()) {
      chordGestures.handleChordPointerDown(canvas, e, mouseX, mouseY, tf, forceLasso)
      if (dragState.value.isDragging) session.pointerId = e.pointerId
      return
    }

    noteGestures.handleNotePointerDown(canvas, e, mouseX, mouseY, tf, forceLasso)
    if (dragState.value.isDragging) session.pointerId = e.pointerId
  }

  function handlePointerUp(e: PointerEvent): void {
    const canvas = options.canvasRef.value
    if (session.pointerId !== null && e.pointerId !== session.pointerId) return
    session.pointerId = null
    if (canvas?.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId)
    }

    if (!dragState.value.isDragging) {
      return
    }

    const mode = dragState.value.mode
    if (mode === 'work-range') {
      if (e.type === 'pointercancel') {
        workRangeGestures.cancel()
      } else {
        const rect = canvas?.getBoundingClientRect()
        if (rect) {
          const tf = ctx.getTransformOptions()
          const mouseX = e.clientX - rect.left
          workRangeGestures.update(mouseX, tf)
          workRangeGestures.finishClick(mouseX, tf)
        }
      }
      finishGesture(canvas)
      return
    }
    if (e.type === 'pointercancel') {
      finishGesture(canvas)
      return
    }
    if (isChordDragMode(mode)) {
      chordGestures.commitChordDrag(mode)
    } else {
      noteGestures.commitNoteDrag(mode)
    }

    finishGesture(canvas)
  }

  function handleLostPointerCapture(e: PointerEvent): void {
    if (e.pointerId !== session.pointerId || !dragState.value.isDragging) return
    if (dragState.value.mode === 'work-range') workRangeGestures.cancel()
    finishGesture(options.canvasRef.value)
  }

  function finishGesture(canvas: HTMLCanvasElement | null): void {
    resetGestureSession(session)
    const tool = toValue(options.activeTool)
    if (canvas) canvas.style.cursor = tool === 'pan' ? 'grab' : 'default'
    options.requestDraw?.()
  }

  function handleDoubleClick(e: MouseEvent): void {
    const canvas = options.canvasRef.value
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const tf = ctx.getTransformOptions()
    if (mouseX < tf.keyboardWidth) return

    if (ctx.isChordTrack()) {
      chordGestures.handleChordDoubleClick(mouseX, mouseY, tf)
      return
    }

    noteGestures.handleNoteDoubleClick(mouseX, mouseY, tf)
  }

  function handleContextMenu(e: MouseEvent): void {
    e.preventDefault()
  }

  function handleAuxClick(e: MouseEvent): void {
    if (e.button === 1) {
      e.preventDefault()
    }
  }

  usePianoRollCanvasEvents(
    options.canvasRef,
    {
      pointermove: handlePointerMove,
      pointerdown: handlePointerDown,
      pointerup: handlePointerUp,
      pointercancel: handlePointerUp,
      lostpointercapture: handleLostPointerCapture,
      pointerleave: handlePointerLeave,
      dblclick: handleDoubleClick,
      contextmenu: handleContextMenu,
      auxclick: handleAuxClick
    },
    (canvas) => {
      if (canvas.title !== '') {
        canvas.title = ''
      }
      if (dragState.value.isDragging && dragState.value.mode === 'work-range') workRangeGestures.cancel()
      if (session.pointerId !== null && canvas.hasPointerCapture(session.pointerId)) {
        const pointerId = session.pointerId
        session.pointerId = null
        canvas.releasePointerCapture(pointerId)
      }
      if (dragState.value.isDragging) finishGesture(canvas)
    }
  )

  return {
    dragState,
    detectZone: (pixelX: number, pixelY: number, note: AppNote) =>
      detectZone(pixelX, pixelY, note, ctx.getTransformOptions()),
    getNoteAtPixel: (pixelX: number, pixelY: number) =>
      getNoteAtPixel(pixelX, pixelY, ctx.currentNotes(), ctx.getTransformOptions())
  }
}
