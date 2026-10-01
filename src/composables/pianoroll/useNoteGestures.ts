import { toValue } from 'vue'
import type { AppNote } from '@/core/schemas/note.schema'
import { pixelXToStep, pixelYToMidi, snapStepToGrid } from './geometry'
import {
  cloneNotes,
  computeAxisLock,
  computeLassoBounds,
  createNote,
  deleteNotes,
  getNoteAtPixel,
  isNoteInLasso,
  moveNotes,
  resizeNotes,
  type DragMode,
  type TransformOptions
} from './noteOps'
import { beginGesture, type GestureSession } from './gestureSession'
import type { PianoRollInteractionContext } from './interactionContext'

/**
 * Melody-track gestures: note hit-testing, pencil creation, drag/clone/resize,
 * marquee lasso selection and hover cursor feedback. Chord gestures live in
 * ./useChordGestures.
 */
export function useNoteGestures(ctx: PianoRollInteractionContext, session: GestureSession) {
  const { options, dragState } = ctx

  function selectHitNote(noteId: string, isShift: boolean): string[] {
    const selectedIds = toValue(options.selectedNoteIds)

    if (isShift) {
      // Shift-click toggles: an already selected note is removed from the selection
      const nextIds = selectedIds.includes(noteId)
        ? selectedIds.filter((id) => id !== noteId)
        : [...selectedIds, noteId]
      options.onUpdateSelectedNoteIds(nextIds)
      return nextIds
    }

    if (selectedIds.includes(noteId)) return selectedIds

    options.onUpdateSelectedNoteIds([noteId])
    return [noteId]
  }

  /**
   * Selection seed for a marquee that started on a note. The Lasso tool never moves notes, so a
   * plain press narrows the selection to that note, while Shift keeps the marquee additive.
   */
  function seedLassoSelection(noteId: string, isShift: boolean): string[] {
    const selectedIds = toValue(options.selectedNoteIds)
    if (isShift) return selectHitNote(noteId, true)
    if (selectedIds.length === 1 && selectedIds[0] === noteId) return selectedIds

    options.onUpdateSelectedNoteIds([noteId])
    return [noteId]
  }

  /**
   * Builds a snapped, duration-guarded note for pencil/double-click creation. Null if out of project bounds.
   */
  function buildNoteAtPixel(mouseX: number, mouseY: number, tf: TransformOptions, currentSnap: number): AppNote | null {
    const step = snapStepToGrid(
      pixelXToStep(mouseX, tf.stepWidth, tf.scrollX, tf.keyboardWidth, 0),
      currentSnap > 0 ? currentSnap : 1
    )
    if (step >= ctx.maxProjectStep.value) return null
    const defaultDuration = currentSnap > 0 ? currentSnap : 1
    const duration = Math.min(ctx.maxProjectStep.value - step, defaultDuration)
    if (duration <= 0) return null

    const midi = ctx.lockMidi(pixelYToMidi(mouseY, tf.rowHeight, tf.scrollY, tf.maxMidi))
    return createNote(step, midi, duration)
  }

  function deleteNoteAndClearSelection(notes: AppNote[], noteId: string): void {
    options.onUpdateNotes(deleteNotes(notes, [noteId]))
    options.onUpdateSelectedNoteIds([])
  }

  function handleNotePointerDown(
    canvas: HTMLCanvasElement,
    e: PointerEvent,
    mouseX: number,
    mouseY: number,
    tf: TransformOptions,
    forceLasso = false
  ): void {
    const currentNotes = ctx.currentNotes()
    const currentSnap = toValue(options.snapStep)
    const tool = toValue(options.activeTool)
    const hit = getNoteAtPixel(mouseX, mouseY, currentNotes, tf)

    // Marquee selection: the Lasso tool claims any press, Cmd/Ctrl only presses on empty space.
    const isLassoTool = tool === 'lasso'
    if (e.button === 0 && (isLassoTool || (forceLasso && hit.zone === 'outside'))) {
      session.dragStartX = mouseX
      session.dragStartY = mouseY
      session.dragStartStep = pixelXToStep(mouseX, tf.stepWidth, tf.scrollX, tf.keyboardWidth, currentSnap)
      session.dragOriginalNotes = [...currentNotes]

      // A Lasso press on a note keeps that note as the marquee seed, so a single click still selects it.
      const seedNote = isLassoTool ? hit.note : null
      if (seedNote) session.noteLassoInitialIds = seedLassoSelection(seedNote.id, e.shiftKey)
      else if (e.shiftKey) session.noteLassoInitialIds = [...toValue(options.selectedNoteIds)]
      else {
        session.noteLassoInitialIds = []
        options.onUpdateSelectedNoteIds([])
      }

      beginGesture(dragState, canvas, e.pointerId, 'lasso')
      return
    }

    // Context Menu / Right-click on Note: Instant Deletion
    if (e.button === 2) {
      e.preventDefault()
      if (hit.note) {
        deleteNoteAndClearSelection(currentNotes, hit.note.id)
      }
      return
    }

    if (e.button !== 0) return

    // Eraser tool click deletes note directly
    if (tool === 'eraser') {
      if (hit.note) {
        deleteNoteAndClearSelection(currentNotes, hit.note.id)
      }
      return
    }

    session.dragStartX = mouseX
    session.dragStartY = mouseY
    session.dragStartStep = pixelXToStep(mouseX, tf.stepWidth, tf.scrollX, tf.keyboardWidth, currentSnap)
    session.dragStartMidi = pixelYToMidi(mouseY, tf.rowHeight, tf.scrollY, tf.maxMidi)
    session.dragOriginalNotes = [...currentNotes]
    session.lastAuditionMidi = null

    // Pencil Tool on empty space creates a note immediately
    if (tool === 'pencil' && hit.zone === 'outside') {
      const newNote = buildNoteAtPixel(mouseX, mouseY, tf, currentSnap)
      if (!newNote) return

      const nextNotes = [...currentNotes, newNote]
      options.onUpdateNotes(nextNotes)
      options.onUpdateSelectedNoteIds([newNote.id])
      ctx.triggerAudition(newNote.pitch)

      session.dragTargetNoteId = newNote.id
      session.dragOriginalNotes = nextNotes
      beginGesture(dragState, canvas, e.pointerId, 'create', [newNote])
      return
    }

    if (hit.zone === 'resize-end' && hit.note) {
      session.dragTargetNoteId = hit.note.id
      selectHitNote(hit.note.id, e.shiftKey)

      beginGesture(dragState, canvas, e.pointerId, 'resize', [hit.note])
      canvas.style.cursor = 'ew-resize'
      return
    }

    if (hit.zone === 'body' && hit.note) {
      session.dragTargetNoteId = hit.note.id
      selectHitNote(hit.note.id, e.shiftKey)

      beginGesture(dragState, canvas, e.pointerId, e.altKey ? 'clone' : 'move', [hit.note])
      canvas.style.cursor = 'grabbing'
      session.lastAuditionMidi = hit.note.midi
      ctx.triggerAudition(hit.note.pitch)
      return
    }

    // Empty space click in select mode starts a marquee lasso
    if (hit.zone === 'outside' && tool === 'select') {
      session.noteLassoInitialIds = e.shiftKey ? [...toValue(options.selectedNoteIds)] : []
      if (!e.shiftKey) {
        options.onUpdateSelectedNoteIds([])
      }
      beginGesture(dragState, canvas, e.pointerId, 'lasso')
    }
  }

  /**
   * Updates the note drag preview for the active note gesture mode.
   * Pan and chord modes are dispatched by the orchestrator before reaching here.
   */
  function handleNoteDragMove(e: PointerEvent, mouseX: number, mouseY: number, tf: TransformOptions): void {
    const mode = dragState.value.mode
    const deltaPixelX = mouseX - session.dragStartX
    const deltaPixelY = mouseY - session.dragStartY
    const currentSnap = toValue(options.snapStep)

    const curStep = pixelXToStep(mouseX, tf.stepWidth, tf.scrollX, tf.keyboardWidth, currentSnap)
    const curMidi = pixelYToMidi(mouseY, tf.rowHeight, tf.scrollY, tf.maxMidi)

    let deltaStep = curStep - session.dragStartStep
    let deltaMidi = curMidi - session.dragStartMidi

    // Shift key axis locking
    if (e.shiftKey && (mode === 'move' || mode === 'clone')) {
      const lock = computeAxisLock(deltaPixelX, deltaPixelY)
      if (lock === 'horizontal') {
        deltaMidi = 0
      } else {
        deltaStep = 0
      }
    }

    if (mode === 'move' || mode === 'clone') {
      const activeIds = activeNoteIds()
      const bounds = {
        minMidi: toValue(options.minMidi),
        maxMidi: toValue(options.maxMidi),
        maxStep: ctx.maxProjectStep.value
      }

      if (mode === 'move') {
        dragState.value.dragNotes = moveNotes(
          session.dragOriginalNotes,
          activeIds,
          deltaStep,
          deltaMidi,
          bounds
        ).filter((n) => activeIds.includes(n.id))
      } else {
        const { newNotes } = cloneNotes(session.dragOriginalNotes, activeIds, deltaStep, deltaMidi, bounds)
        dragState.value.dragNotes = newNotes.filter((n) => !session.dragOriginalNotes.some((orig) => orig.id === n.id))
      }

      // Scale Lock: dragged/cloned notes must never land on a non-scale semitone
      dragState.value.dragNotes = ctx.enforceScaleLock(dragState.value.dragNotes)

      // Live audition when transposing pitch vertically
      const leadPreviewNote = dragState.value.dragNotes[0]
      if (leadPreviewNote && leadPreviewNote.midi !== session.lastAuditionMidi) {
        session.lastAuditionMidi = leadPreviewNote.midi
        ctx.triggerAudition(leadPreviewNote.pitch)
      }

      options.requestDraw?.()
      return
    }

    if (mode === 'resize' || mode === 'create') {
      const activeIds = activeNoteIds()
      const minDuration = currentSnap > 0 ? currentSnap : 1

      dragState.value.dragNotes = resizeNotes(
        session.dragOriginalNotes,
        activeIds,
        deltaStep,
        minDuration,
        ctx.maxProjectStep.value
      ).filter((n) => activeIds.includes(n.id))

      options.requestDraw?.()
      return
    }

    if (mode === 'lasso') {
      const { bounds, rect: lassoRect } = computeLassoBounds(session.dragStartX, session.dragStartY, mouseX, mouseY, tf)
      dragState.value.lassoRect = lassoRect

      const selectedInLasso = ctx
        .currentNotes()
        .filter((n) => isNoteInLasso(n, bounds))
        .map((n) => n.id)

      options.onUpdateSelectedNoteIds([...new Set([...session.noteLassoInitialIds, ...selectedInLasso])])
      options.requestDraw?.()
    }
  }

  /**
   * Target notes of a drag gesture: the explicit selection, else the note that started the drag.
   */
  function activeNoteIds(): string[] {
    const selectedIds = toValue(options.selectedNoteIds)
    return selectedIds.length > 0 ? selectedIds : session.dragTargetNoteId ? [session.dragTargetNoteId] : []
  }

  /**
   * Idle hover cursor styling based on active tool and note hit-testing.
   */
  function handleNoteHover(canvas: HTMLCanvasElement, mouseX: number, mouseY: number, tf: TransformOptions): void {
    const tool = toValue(options.activeTool)
    const hit = getNoteAtPixel(mouseX, mouseY, ctx.currentNotes(), tf)

    if (tool === 'lasso') {
      // The Lasso tool only ever draws a marquee, so notes never show move or resize cursors.
      canvas.style.cursor = 'crosshair'
      return
    }

    if (tool === 'eraser') {
      canvas.style.cursor = hit.zone !== 'outside' ? 'pointer' : 'default'
      return
    }

    if (hit.zone === 'resize-end') {
      canvas.style.cursor = 'ew-resize'
    } else if (hit.zone === 'body') {
      canvas.style.cursor = 'grab'
    } else {
      canvas.style.cursor = tool === 'pencil' || tool === 'select' ? 'crosshair' : 'default'
    }
  }

  function handleNoteDoubleClick(mouseX: number, mouseY: number, tf: TransformOptions): void {
    const currentNotes = ctx.currentNotes()
    const hit = getNoteAtPixel(mouseX, mouseY, currentNotes, tf)

    // The Lasso tool selects, it never creates or deletes material.
    if (toValue(options.activeTool) === 'lasso') {
      options.onUpdateSelectedNoteIds(hit.note ? [hit.note.id] : [])
      return
    }

    // Double-click on existing note -> delete
    if (hit.note) {
      deleteNoteAndClearSelection(currentNotes, hit.note.id)
      return
    }

    // Double-click on empty space -> create note
    const newNote = buildNoteAtPixel(mouseX, mouseY, tf, toValue(options.snapStep))
    if (!newNote) return

    options.onUpdateNotes([...currentNotes, newNote])
    options.onUpdateSelectedNoteIds([newNote.id])
    ctx.triggerAudition(newNote.pitch)
  }

  /**
   * Commits a finished note gesture to the store. No-movement clicks deliberately
   * fall through so they never burn an undo slot.
   */
  function commitNoteDrag(mode: DragMode): void {
    const dragNotes = dragState.value.dragNotes

    if (mode === 'move' && dragNotes.length > 0) {
      const movedMap = new Map(dragNotes.map((n) => [n.id, n]))
      options.onUpdateNotes(session.dragOriginalNotes.map((n) => movedMap.get(n.id) ?? n))
    } else if (mode === 'clone' && dragNotes.length > 0) {
      options.onUpdateNotes([...session.dragOriginalNotes, ...dragNotes])
      options.onUpdateSelectedNoteIds(dragNotes.map((n) => n.id))
    } else if ((mode === 'resize' || mode === 'create') && dragNotes.length > 0) {
      const resizedMap = new Map(dragNotes.map((n) => [n.id, n]))
      options.onUpdateNotes(session.dragOriginalNotes.map((n) => resizedMap.get(n.id) ?? n))
    }
  }

  return {
    buildNoteAtPixel,
    commitNoteDrag,
    handleNoteDoubleClick,
    handleNoteDragMove,
    handleNoteHover,
    handleNotePointerDown
  }
}
