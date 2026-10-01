import { toValue } from 'vue'
import { chordNoteKey } from '@/core/schemas/chord.schema'
import { midiToPitch, pitchToMidi } from '@/core/theory/scale.engine'
import { pixelXToStep, pixelYToMidi, snapStepToGrid } from './geometry'
import {
  chordStepRange,
  createChordDraft,
  findChordAtStep,
  getChordHitAtPixel,
  quantizeDeltaBars,
  resizeChordByBars
} from './chordOps'
import { computeAxisLock, computeLassoBounds, type DragMode, type TransformOptions } from './noteOps'
import { computeChordDragPreview } from './chordDragPreview'
import { beginGesture, type GestureSession } from './gestureSession'
import type { PianoRollInteractionContext } from './interactionContext'
import { useChordEditing } from './useChordEditing'

export type ChordDragMode = Extract<DragMode, `chord-${string}`>

const CHORD_DRAG_MODES: readonly ChordDragMode[] = [
  'chord-move',
  'chord-clone',
  'chord-note',
  'chord-resize',
  'chord-create',
  'chord-lasso'
]

export function isChordDragMode(mode: DragMode): mode is ChordDragMode {
  return mode !== null && (CHORD_DRAG_MODES as readonly string[]).includes(mode)
}

/**
 * Chord-track pointer gestures: voicing hit-testing, chord/voicing creation and deletion,
 * block move/clone/resize drags and marquee selection across voicing notes.
 *
 * Preview math is pure (./chordDragPreview); store mutations go through ./useChordEditing;
 * melody note gestures live in ./useNoteGestures.
 */
export function useChordGestures(ctx: PianoRollInteractionContext, session: GestureSession) {
  const { options, dragState } = ctx
  const editing = useChordEditing(ctx)

  function triggerChordAudition(_voicing: string[]): void {
    // Chord audition completely removed as per user request (melody audition remains active)
  }

  /**
   * Updates the chord drag preview for the active chord gesture mode.
   */
  function handleChordDragMove(
    e: PointerEvent,
    mouseX: number,
    mouseY: number,
    tf: TransformOptions,
    mode: ChordDragMode
  ): void {
    if (mode === 'chord-lasso') {
      const { bounds, rect: lassoRect } = computeLassoBounds(session.dragStartX, session.dragStartY, mouseX, mouseY, tf)
      dragState.value.lassoRect = lassoRect

      const minLassoStep = Math.min(bounds.startStep, bounds.endStep)
      const maxLassoStep = Math.max(bounds.startStep, bounds.endStep)
      const keys: string[] = []
      for (const snap of session.chordLassoSnapshot) {
        // Time-range early-out before the pitch check keeps the per-move cost low
        if (snap.endStep <= minLassoStep || snap.startStep >= maxLassoStep) continue
        if (snap.midi < bounds.minMidi || snap.midi > bounds.maxMidi) continue
        keys.push(chordNoteKey(snap.chordId, snap.noteIndex))
      }
      options.onUpdateSelectedChordNoteIds?.([...new Set([...session.chordLassoInitialIds, ...keys])])
      options.requestDraw?.()
      return
    }

    const currentSnap = toValue(options.snapStep)
    const stepsPerBar = ctx.currentStepsPerBar()
    const curStep = pixelXToStep(mouseX, tf.stepWidth, tf.scrollX, tf.keyboardWidth, currentSnap)
    const curMidi = pixelYToMidi(mouseY, tf.rowHeight, tf.scrollY, tf.maxMidi)
    const deltaStep = curStep - session.dragStartStep
    const deltaMidi = curMidi - session.dragStartMidi

    if (mode === 'chord-move' || mode === 'chord-clone' || mode === 'chord-note') {
      let deltaBars = quantizeDeltaBars(deltaStep / stepsPerBar, currentSnap, stepsPerBar)
      let effectiveDeltaMidi = deltaMidi

      if (e.shiftKey) {
        const lock = computeAxisLock(mouseX - session.dragStartX, mouseY - session.dragStartY)
        if (lock === 'horizontal') {
          effectiveDeltaMidi = 0
        } else {
          deltaBars = 0
        }
      }

      const preview = computeChordDragPreview({
        originalChords: session.chordDragOriginalChords,
        mode,
        deltaBars,
        deltaMidi: effectiveDeltaMidi,
        targetId: session.chordDragTargetId,
        targetNoteIndex: session.chordDragNoteIndex,
        activeIds: session.chordDragActiveIds,
        totalBars: ctx.totalBarsLimit(),
        scaleLock: toValue(options.isScaleLocked)
          ? { rootKey: toValue(options.rootKey), scale: toValue(options.scale) }
          : undefined
      })

      if (preview.dirty) session.chordDragDirty = true
      dragState.value.dragChords = preview.chords

      if (mode === 'chord-note' && session.chordDragTargetId) {
        const previewChord = preview.chords.find((c) => c.id === session.chordDragTargetId)
        if (previewChord) triggerChordAudition(previewChord.voicing)
      } else if (mode === 'chord-move' || mode === 'chord-clone') {
        const leadChord = preview.chords.find((c) => session.chordDragActiveIds.includes(c.id))
        if (leadChord) triggerChordAudition(leadChord.voicing)
      }

      options.requestDraw?.()
      return
    }

    // chord-resize / chord-create
    const deltaBars = quantizeDeltaBars(deltaStep / stepsPerBar, currentSnap, stepsPerBar)
    if (!session.chordDragTargetId || deltaBars === 0) return
    dragState.value.dragChords = resizeChordByBars(
      session.chordDragOriginalChords,
      session.chordDragTargetId,
      deltaBars,
      {
        totalBars: ctx.totalBarsLimit()
      }
    )
    session.chordDragDirty = true
    options.requestDraw?.()
  }

  function createChordAtPixel(
    mouseX: number,
    mouseY: number,
    tf: TransformOptions,
    beginDragWith?: { canvas: HTMLCanvasElement; e: PointerEvent }
  ): void {
    const chords = ctx.currentChords()
    const stepsPerBar = ctx.currentStepsPerBar()
    const currentSnap = toValue(options.snapStep)

    const rawStep = pixelXToStep(mouseX, tf.stepWidth, tf.scrollX, tf.keyboardWidth, 0)
    let startBar: number
    if (currentSnap >= 4) {
      const step = snapStepToGrid(rawStep, currentSnap)
      startBar = step / stepsPerBar
    } else {
      startBar = Math.floor(rawStep / stepsPerBar)
    }

    const availableBars = ctx.totalBarsLimit() - startBar
    const nextChord = chords.filter((c) => c.startBar > startBar).sort((a, b) => a.startBar - b.startBar)[0]
    const maxAllowedBars = nextChord ? Math.max(0.25, nextChord.startBar - startBar) : availableBars
    const durationBars = Math.min(1, maxAllowedBars)

    const midi = ctx.lockMidi(pixelYToMidi(mouseY, tf.rowHeight, tf.scrollY, tf.maxMidi))
    const pitch = midiToPitch(midi)
    const draft = createChordDraft(startBar, durationBars, pitch, { totalBars: ctx.totalBarsLimit() })
    if (!draft) return

    if (beginDragWith) {
      session.chordDragTargetId = draft.id
      session.chordDragNoteIndex = 0
      session.chordCommitOriginals = [...chords]
      session.chordDragOriginalChords = [...chords, draft]
      session.chordDragDirty = true
      options.onUpdateSelectedChordNoteIds?.([chordNoteKey(draft.id, 0)])
      beginGesture(
        dragState,
        beginDragWith.canvas,
        beginDragWith.e.pointerId,
        'chord-create',
        [],
        session.chordDragOriginalChords
      )
    } else {
      editing.commitChords([...chords, draft], chords)
      options.onUpdateSelectedChordNoteIds?.([chordNoteKey(draft.id, 0)])
    }
  }

  function handleChordPointerDown(
    canvas: HTMLCanvasElement,
    e: PointerEvent,
    mouseX: number,
    mouseY: number,
    tf: TransformOptions,
    forceLasso = false
  ): void {
    const tool = toValue(options.activeTool)
    const chords = ctx.currentChords()
    const hit = getChordHitAtPixel(mouseX, mouseY, chords, tf, ctx.currentStepsPerBar())

    // Marquee selection: the Lasso tool claims any press, Cmd/Ctrl only presses on empty space.
    const isLassoTool = tool === 'lasso'
    if (e.button === 0 && (isLassoTool || (forceLasso && hit.zone === 'outside'))) {
      session.dragStartX = mouseX
      session.dragStartY = mouseY
      session.dragStartStep = pixelXToStep(
        mouseX,
        tf.stepWidth,
        tf.scrollX,
        tf.keyboardWidth,
        toValue(options.snapStep)
      )
      session.chordLassoSnapshot = []

      // A Lasso press on a chord tone seeds the marquee with that tone, so a click still selects it.
      const seedIds = isLassoTool && hit.chord && hit.noteIndex >= 0 ? [chordNoteKey(hit.chord.id, hit.noteIndex)] : []
      if (e.shiftKey) {
        session.chordLassoInitialIds = [...(toValue(options.selectedChordNoteIds) ?? []), ...seedIds]
      } else {
        session.chordLassoInitialIds = seedIds
        options.onUpdateSelectedChordNoteIds?.(seedIds)
      }

      for (const chord of chords) {
        const { startStep, endStep } = chordStepRange(chord, ctx.currentStepsPerBar())
        for (let i = 0; i < chord.voicing.length; i++) {
          session.chordLassoSnapshot.push({
            chordId: chord.id,
            noteIndex: i,
            startStep,
            endStep,
            midi: pitchToMidi(chord.voicing[i])
          })
        }
      }
      beginGesture(dragState, canvas, e.pointerId, 'chord-lasso')
      return
    }

    // Right-click: instant deletion of the hit voicing note or whole chord
    if (e.button === 2) {
      e.preventDefault()
      if (hit.chord) {
        if (hit.zone === 'note' && hit.noteIndex >= 0) {
          editing.removeChordNoteAndCommit(chords, hit.chord.id, hit.noteIndex)
        } else {
          editing.removeChordAndCommit(chords, hit.chord.id)
        }
      }
      return
    }

    if (e.button !== 0) return

    if (tool === 'eraser') {
      if (hit.chord && hit.zone === 'note' && hit.noteIndex >= 0) {
        editing.removeChordNoteAndCommit(chords, hit.chord.id, hit.noteIndex)
      } else if (hit.chord && hit.zone !== 'outside') {
        editing.removeChordAndCommit(chords, hit.chord.id)
      }
      return
    }

    session.dragStartX = mouseX
    session.dragStartY = mouseY
    session.dragStartStep = pixelXToStep(mouseX, tf.stepWidth, tf.scrollX, tf.keyboardWidth, toValue(options.snapStep))
    session.dragStartMidi = pixelYToMidi(mouseY, tf.rowHeight, tf.scrollY, tf.maxMidi)
    session.chordCommitOriginals = [...chords]
    session.chordDragOriginalChords = [...chords]
    session.chordDragTargetId = null
    session.chordDragNoteIndex = -1
    session.chordDragActiveIds = []
    session.chordDragDirty = false
    session.chordLassoSnapshot = []

    if (tool === 'pencil') {
      const rawStep = pixelXToStep(mouseX, tf.stepWidth, tf.scrollX, tf.keyboardWidth, 0)
      const existingChord = findChordAtStep(rawStep, chords, ctx.currentStepsPerBar())

      if (existingChord) {
        const midi = ctx.lockMidi(pixelYToMidi(mouseY, tf.rowHeight, tf.scrollY, tf.maxMidi))
        editing.toggleChordNoteAtMidi(chords, existingChord, midi)
        return
      }

      createChordAtPixel(mouseX, mouseY, tf, { canvas, e })
      return
    }

    // Select tool
    if (hit.zone === 'resize-end' && hit.chord) {
      session.chordDragTargetId = hit.chord.id
      beginGesture(dragState, canvas, e.pointerId, 'chord-resize', [], chords)
      canvas.style.cursor = 'ew-resize'
      return
    }

    if (hit.zone === 'note' && hit.chord && hit.noteIndex >= 0) {
      session.chordDragTargetId = hit.chord.id
      session.chordDragActiveIds = [hit.chord.id]

      if (e.altKey) {
        // Option + Drag on a voicing note: clone that note into the chord and drag the copy
        const pitchToClone = hit.chord.voicing[hit.noteIndex]
        const clonedChords = chords.map((c) => {
          if (c.id !== hit.chord!.id) return c
          return { ...c, voicing: [...c.voicing, pitchToClone] }
        })
        session.chordDragNoteIndex = hit.chord.voicing.length
        session.chordCommitOriginals = [...chords]
        session.chordDragOriginalChords = clonedChords
        session.chordDragDirty = true
        beginGesture(dragState, canvas, e.pointerId, 'chord-note', [], session.chordDragOriginalChords)
      } else {
        editing.selectChordNoteKey(chordNoteKey(hit.chord.id, hit.noteIndex), e.shiftKey)
        session.chordDragNoteIndex = hit.noteIndex
        beginGesture(dragState, canvas, e.pointerId, 'chord-note', [], chords)
      }
      canvas.style.cursor = 'grabbing'
      triggerChordAudition(hit.chord.voicing)
      return
    }

    if (hit.zone === 'block' && hit.chord) {
      const selection = editing.selectedChordIds()

      if (selection.has(hit.chord.id)) {
        session.chordDragActiveIds = [...selection]
      } else {
        session.chordDragActiveIds = [hit.chord.id]
        editing.selectAllChordNotes(hit.chord)
      }

      if (e.altKey) {
        // Option + Drag on chord block: clone chord(s)
        const toClone = chords.filter((c) => session.chordDragActiveIds.includes(c.id))
        const cloned = toClone.map((c) => ({
          ...c,
          id: crypto.randomUUID(),
          voicing: [...c.voicing],
          notes: [...c.notes]
        }))
        session.chordDragActiveIds = cloned.map((c) => c.id)
        session.chordCommitOriginals = [...chords]
        session.chordDragOriginalChords = [...chords, ...cloned]
        session.chordDragDirty = false
        beginGesture(dragState, canvas, e.pointerId, 'chord-clone', [], session.chordDragOriginalChords)
      } else {
        beginGesture(dragState, canvas, e.pointerId, 'chord-move', [], chords)
      }
      canvas.style.cursor = 'grabbing'
      triggerChordAudition(hit.chord.voicing)
      return
    }

    // Empty space click starts a marquee lasso across chord notes
    if (hit.zone === 'outside' && tool === 'select') {
      session.chordLassoInitialIds = e.shiftKey ? [...(toValue(options.selectedChordNoteIds) ?? [])] : []
      if (!e.shiftKey) {
        options.onUpdateSelectedChordNoteIds?.([])
      }
      // Snapshot hit geometry once: the committed chords never mutate mid-gesture
      const spb = ctx.currentStepsPerBar()
      for (const chord of chords) {
        const { startStep, endStep } = chordStepRange(chord, spb)
        for (let i = 0; i < chord.voicing.length; i++) {
          session.chordLassoSnapshot.push({
            chordId: chord.id,
            noteIndex: i,
            startStep,
            endStep,
            midi: pitchToMidi(chord.voicing[i])
          })
        }
      }
      beginGesture(dragState, canvas, e.pointerId, 'chord-lasso')
    }
  }

  /**
   * Idle hover cursor styling for the chord track.
   */
  function handleChordHover(canvas: HTMLCanvasElement, mouseX: number, mouseY: number, tf: TransformOptions): void {
    const tool = toValue(options.activeTool)
    const chordHit = getChordHitAtPixel(mouseX, mouseY, ctx.currentChords(), tf, ctx.currentStepsPerBar())

    if (tool === 'eraser') {
      canvas.style.cursor = chordHit.zone !== 'outside' ? 'pointer' : 'default'
      return
    }

    if (tool === 'lasso') {
      // The Lasso tool only ever draws a marquee, so chords never show move or resize cursors.
      canvas.style.cursor = 'crosshair'
      return
    }

    if (chordHit.zone === 'resize-end') {
      canvas.style.cursor = 'ew-resize'
    } else if (chordHit.zone === 'note' || chordHit.zone === 'block') {
      canvas.style.cursor = tool === 'pencil' ? 'crosshair' : 'grab'
    } else {
      canvas.style.cursor = tool === 'pencil' || tool === 'select' ? 'crosshair' : 'default'
    }
  }

  function handleChordDoubleClick(mouseX: number, mouseY: number, tf: TransformOptions): void {
    const chords = ctx.currentChords()
    const stepsPerBar = ctx.currentStepsPerBar()
    const hit = getChordHitAtPixel(mouseX, mouseY, chords, tf, stepsPerBar)

    // The Lasso tool selects, it never creates or deletes material.
    if (toValue(options.activeTool) === 'lasso') {
      const seed =
        hit.chord && hit.zone === 'note' && hit.noteIndex >= 0 ? [chordNoteKey(hit.chord.id, hit.noteIndex)] : []
      options.onUpdateSelectedChordNoteIds?.(seed)
      return
    }

    // Double-click on a voicing note -> delete it
    if (hit.chord && hit.zone === 'note' && hit.noteIndex >= 0) {
      editing.removeChordNoteAndCommit(chords, hit.chord.id, hit.noteIndex)
      return
    }

    const rawStep = pixelXToStep(mouseX, tf.stepWidth, tf.scrollX, tf.keyboardWidth, 0)
    const chordAtStep = findChordAtStep(rawStep, chords, stepsPerBar)

    if (chordAtStep) {
      editing.toggleChordNoteAtMidi(
        chords,
        chordAtStep,
        ctx.lockMidi(pixelYToMidi(mouseY, tf.rowHeight, tf.scrollY, tf.maxMidi))
      )
      return
    }

    // Double-click on empty space -> create chord
    createChordAtPixel(mouseX, mouseY, tf)
  }

  /**
   * Commits a finished chord gesture. No-movement clicks deliberately fall through
   * so they never burn an undo slot.
   */
  function commitChordDrag(mode: ChordDragMode): void {
    if (mode === 'chord-lasso') return

    const preview = dragState.value.dragChords
    if (!session.chordDragDirty || preview.length === 0 || !options.onUpdateChords) return

    editing.commitChords(preview, session.chordCommitOriginals)

    if (mode === 'chord-clone' && session.chordDragActiveIds.length > 0) {
      const newKeys = session.chordDragActiveIds.flatMap((id) => {
        const c = preview.find((x) => x.id === id)
        return c ? c.voicing.map((_, i) => chordNoteKey(c.id, i)) : []
      })
      if (newKeys.length > 0) {
        options.onUpdateSelectedChordNoteIds?.(newKeys)
      }
    }
  }

  return {
    commitChordDrag,
    createChordAtPixel,
    handleChordDoubleClick,
    handleChordDragMove,
    handleChordHover,
    handleChordPointerDown
  }
}
