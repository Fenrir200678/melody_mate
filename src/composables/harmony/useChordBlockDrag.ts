import { computed, onScopeDispose, shallowRef, watch } from 'vue'
import type { ChordEvent } from '@/core/schemas/chord.schema'
import { calculateMovedStartBar } from '@/core/theory/chord-positioning'
import { CHORD_TIMELINE_DRAG } from '@/config/ui-defaults'

export interface ChordDragState {
  isDragging: boolean
  isCloning: boolean
  draggedChordId: string
  previewStartBar: number
  dragOffsetPixels: number
}

interface DragOptions {
  chords: () => readonly ChordEvent[]
  barWidth: () => number
  totalBars: () => number
  scrollLeft: () => number
  onSelect: (chord: ChordEvent) => void
  onCommit: (id: string, startBar: number, clone: boolean) => void
}

export function useChordBlockDrag(options: DragOptions) {
  const dragState = shallowRef<ChordDragState | null>(null)
  const snapGrid = computed(() => {
    const width = options.barWidth()
    if (width >= CHORD_TIMELINE_DRAG.fineSnapMinBarWidth) return CHORD_TIMELINE_DRAG.fineSnapBars
    if (width >= CHORD_TIMELINE_DRAG.mediumSnapMinBarWidth) return CHORD_TIMELINE_DRAG.mediumSnapBars
    return CHORD_TIMELINE_DRAG.coarseSnapBars
  })
  let session: {
    chord: ChordEvent
    element: HTMLElement
    pointerId: number
    initialX: number
    initialScroll: number
    isDragging: boolean
  } | null = null
  let frame: number | null = null
  let pending: ChordDragState | null = null
  let suppressedClickId: string | null = null

  function flushPreview(): void {
    if (frame !== null) cancelAnimationFrame(frame)
    frame = null
    dragState.value = pending
  }

  function cancelDrag(): void {
    const previous = session
    session = null
    pending = null
    flushPreview()
    if (previous?.isDragging) suppressedClickId = previous.chord.id
    if (previous?.element.hasPointerCapture(previous.pointerId)) {
      previous.element.releasePointerCapture(previous.pointerId)
    }
  }

  function onPointerDown(event: PointerEvent, chord: ChordEvent): void {
    if (event.button !== 0 || !event.isPrimary || session) return
    suppressedClickId = null
    const element = event.currentTarget as HTMLElement
    element.setPointerCapture(event.pointerId)
    session = {
      chord,
      element,
      pointerId: event.pointerId,
      initialX: event.clientX,
      initialScroll: options.scrollLeft(),
      isDragging: false
    }
  }

  function updatePreview(event: PointerEvent): void {
    if (!session || event.pointerId !== session.pointerId) return
    const delta = event.clientX - session.initialX + options.scrollLeft() - session.initialScroll
    if (!session.isDragging && Math.abs(delta) < CHORD_TIMELINE_DRAG.thresholdPx) return
    session.isDragging = true
    pending = {
      isDragging: true,
      isCloning: event.altKey,
      draggedChordId: session.chord.id,
      previewStartBar: calculateMovedStartBar(
        session.chord.startBar,
        delta,
        options.barWidth(),
        session.chord.durationBars,
        { totalBars: options.totalBars(), snapGrid: snapGrid.value }
      ),
      dragOffsetPixels: delta
    }
  }

  function onPointerMove(event: PointerEvent): void {
    updatePreview(event)
    if (pending && frame === null) frame = requestAnimationFrame(flushPreview)
  }

  function onPointerUp(event: PointerEvent): void {
    if (!session || event.pointerId !== session.pointerId) return
    updatePreview(event)
    const committed = pending
    cancelDrag()
    if (committed) {
      options.onCommit(committed.draggedChordId, committed.previewStartBar, committed.isCloning)
    }
  }

  function onPointerCancel(event: PointerEvent): void {
    if (session?.pointerId === event.pointerId) cancelDrag()
  }

  function onClick(event: MouseEvent, chord: ChordEvent): void {
    if (event.detail !== 0 && suppressedClickId === chord.id) {
      suppressedClickId = null
      return
    }
    options.onSelect(chord)
  }

  function nudgeChord(chord: ChordEvent, direction: number, clone: boolean): void {
    cancelDrag()
    const start = calculateMovedStartBar(
      chord.startBar,
      direction * snapGrid.value * options.barWidth(),
      options.barWidth(),
      chord.durationBars,
      { totalBars: options.totalBars(), snapGrid: snapGrid.value }
    )
    options.onCommit(chord.id, start, clone)
  }

  watch([options.chords, options.barWidth, options.totalBars], cancelDrag)
  onScopeDispose(cancelDrag)

  return {
    dragState,
    snapGrid,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClick,
    cancelDrag,
    nudgeChord
  }
}
