import type { Ref } from 'vue'
import type { ChordEvent } from '@/core/schemas/chord.schema'
import type { AppNote } from '@/core/schemas/note.schema'
import type { WorkRange } from '@/core/generator/work-range'
import type { DragMode, DragState } from './noteOps'

/**
 * Immutable hit geometry of one chord voicing note, captured once at gesture start.
 * The committed chord array never mutates mid-gesture, so a single snapshot keeps
 * per-pointermove lasso cost proportional to the hit note count.
 */
export interface ChordLassoEntry {
  chordId: string
  noteIndex: number
  startStep: number
  endStep: number
  midi: number
}

export type WorkRangeAction = 'create' | 'move' | 'resize-start' | 'resize-end'

/**
 * Mutable scratch state shared by all piano-roll pointer gestures.
 *
 * Only `dragState` is reactive (the canvas renders from it); every other field is a
 * plain value written on pointerdown and read during pointermove/pointerup, so it must
 * never become a `ref`.
 */
export interface GestureSession {
  dragState: Ref<DragState>
  pointerId: number | null

  // Melody note anchors, in canvas pixels plus their step/MIDI projections
  dragStartX: number
  dragStartY: number
  dragStartStep: number
  dragStartMidi: number
  dragTargetNoteId: string | null
  dragOriginalNotes: AppNote[]
  noteLassoInitialIds: string[]
  lastAuditionMidi: number | null

  // Chord anchors, active selection and preview bookkeeping
  chordDragTargetId: string | null
  chordDragNoteIndex: number
  chordDragActiveIds: string[]
  chordDragOriginalChords: ChordEvent[]
  /** Committed store state at gesture start (excludes newly drafted chords) for rename diffing */
  chordCommitOriginals: ChordEvent[]
  /** True once a chord drag gesture actually mutated its preview (guards no-op undo entries) */
  chordDragDirty: boolean
  chordLassoSnapshot: ChordLassoEntry[]
  chordLassoInitialIds: string[]

  // Pan anchors in client coordinates
  panStartX: number
  panStartY: number
  panStartScrollX: number
  panStartScrollY: number
  workRangeStartStep: number
  workRangeStartX: number
  workRangeOriginal: WorkRange | null
  workRangeAction: WorkRangeAction
  workRangeChanged: boolean
}

export function createDragState(): DragState {
  return {
    isDragging: false,
    mode: null,
    dragNotes: [],
    dragChords: [],
    lassoRect: null
  }
}

export function createGestureSession(dragState: Ref<DragState>): GestureSession {
  return {
    dragState,
    pointerId: null,
    dragStartX: 0,
    dragStartY: 0,
    dragStartStep: 0,
    dragStartMidi: 0,
    dragTargetNoteId: null,
    dragOriginalNotes: [],
    noteLassoInitialIds: [],
    lastAuditionMidi: null,
    chordDragTargetId: null,
    chordDragNoteIndex: -1,
    chordDragActiveIds: [],
    chordDragOriginalChords: [],
    chordCommitOriginals: [],
    chordDragDirty: false,
    chordLassoSnapshot: [],
    chordLassoInitialIds: [],
    panStartX: 0,
    panStartY: 0,
    panStartScrollX: 0,
    panStartScrollY: 0,
    workRangeStartStep: 0,
    workRangeStartX: 0,
    workRangeOriginal: null,
    workRangeAction: 'create',
    workRangeChanged: false
  }
}

/**
 * Starts a gesture and captures the pointer on the canvas so move/up events keep
 * arriving even when the cursor leaves the element bounds.
 */
export function beginGesture(
  dragState: Ref<DragState>,
  canvas: HTMLCanvasElement,
  pointerId: number,
  mode: DragMode,
  dragNotes: AppNote[] = [],
  dragChords: ChordEvent[] = []
): void {
  dragState.value = { isDragging: true, mode, dragNotes, dragChords, lassoRect: null }
  if (!canvas.hasPointerCapture(pointerId)) {
    canvas.setPointerCapture(pointerId)
  }
}

/**
 * Clears the per-gesture scratch fields once a pointer gesture has been committed.
 * Drag origins (`dragOriginalNotes`, `chordDragOriginalChords`) are intentionally left
 * alone: every pointerdown re-seeds them before a gesture can read them.
 */
export function resetGestureSession(session: GestureSession): void {
  session.dragState.value = createDragState()
  session.pointerId = null
  session.dragTargetNoteId = null
  session.lastAuditionMidi = null
  session.chordDragTargetId = null
  session.chordDragNoteIndex = -1
  session.chordDragActiveIds = []
  session.chordDragDirty = false
  session.chordLassoSnapshot = []
  session.noteLassoInitialIds = []
  session.chordLassoInitialIds = []
  session.workRangeOriginal = null
  session.workRangeAction = 'create'
  session.workRangeChanged = false
}
