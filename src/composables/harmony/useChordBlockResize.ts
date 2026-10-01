import { onScopeDispose, shallowRef, watch } from 'vue'
import type { ChordEvent } from '@/core/schemas/chord.schema'
import { calculateResizedDuration, chordResizeLimit } from '@/core/theory/chord-resize'
import { CHORD_TIMELINE_RESIZE } from '@/config/ui-defaults'

export interface ChordResizeState {
  isResizing: boolean
  chordId: string
  previewDurationBars: number
}

interface ResizeOptions {
  chords: () => readonly ChordEvent[]
  barWidth: () => number
  totalBars: () => number
  scrollLeft: () => number
  onCommit: (id: string, durationBars: number) => void
}

export function useChordBlockResize(options: ResizeOptions) {
  const resizeState = shallowRef<ChordResizeState | null>(null)
  let session: {
    chord: ChordEvent
    element: HTMLElement
    pointerId: number
    initialX: number
    initialScroll: number
  } | null = null
  let frame: number | null = null
  let pending: ChordResizeState | null = null
  const bounds = () => ({
    totalBars: options.totalBars(),
    snapGrid: CHORD_TIMELINE_RESIZE.snapBars,
    minDuration: CHORD_TIMELINE_RESIZE.minDurationBars
  })

  function flushPreview(): void {
    if (frame !== null) cancelAnimationFrame(frame)
    frame = null
    resizeState.value = pending
  }

  function cancelResize(): void {
    const previous = session
    session = null
    pending = null
    flushPreview()
    if (previous?.element.hasPointerCapture(previous.pointerId)) {
      previous.element.releasePointerCapture(previous.pointerId)
    }
  }

  function onPointerDown(event: PointerEvent, chord: ChordEvent): void {
    if (event.button !== 0 || !event.isPrimary || session || options.barWidth() <= 0) return
    if (chordResizeLimit(chord, options.chords(), bounds()) < CHORD_TIMELINE_RESIZE.minDurationBars) return
    const element = event.currentTarget as HTMLElement
    element.focus()
    element.setPointerCapture(event.pointerId)
    session = {
      chord,
      element,
      pointerId: event.pointerId,
      initialX: event.clientX,
      initialScroll: options.scrollLeft()
    }
    pending = { isResizing: true, chordId: chord.id, previewDurationBars: chord.durationBars }
    flushPreview()
  }

  function updatePreview(event: PointerEvent): void {
    if (!session || event.pointerId !== session.pointerId) return
    const deltaPixels = event.clientX - session.initialX + options.scrollLeft() - session.initialScroll
    pending = {
      isResizing: true,
      chordId: session.chord.id,
      previewDurationBars: calculateResizedDuration(
        session.chord,
        options.chords(),
        deltaPixels / options.barWidth(),
        bounds()
      )
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
    const originalDuration = session.chord.durationBars
    cancelResize()
    if (committed && committed.previewDurationBars !== originalDuration) {
      options.onCommit(committed.chordId, committed.previewDurationBars)
    }
  }

  function onPointerCancel(event: PointerEvent): void {
    if (session?.pointerId === event.pointerId) cancelResize()
  }

  function nudgeDuration(chord: ChordEvent, direction: number): void {
    cancelResize()
    const duration = calculateResizedDuration(
      chord,
      options.chords(),
      direction * CHORD_TIMELINE_RESIZE.snapBars,
      bounds()
    )
    if (duration !== chord.durationBars) options.onCommit(chord.id, duration)
  }

  watch([options.chords, options.barWidth, options.totalBars], cancelResize, { flush: 'sync' })
  onScopeDispose(cancelResize)

  return { resizeState, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, cancelResize, nudgeDuration }
}
