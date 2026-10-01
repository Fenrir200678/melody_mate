import { nextTick, ref, watch, type Ref } from 'vue'
import type { AppNote } from '@/core/schemas/note.schema'
import type { ChordEvent } from '@/core/schemas/chord.schema'
import type { PianoRollTrack } from './usePianoRollCanvas'
import type { usePianoRollZoom } from './usePianoRollZoom'

type ZoomControls = ReturnType<typeof usePianoRollZoom>
interface NavigationOptions {
  notes: Ref<AppNote[]>
  chords: Ref<ChordEvent[]>
  chordVoicingMidis: Ref<number[]>
  effectiveMinMidi: Ref<number>
  effectiveMaxMidi: Ref<number>
  activeTrack: Ref<PianoRollTrack>
  viewportWidth: Ref<number>
  viewportHeight: Ref<number>
  totalContentHeight: Ref<number>
  maxScrollX: Ref<number>
  scrollX: Ref<number>
  scrollY: Ref<number>
  stepWidth: Ref<number>
  rowHeight: Ref<number>
  keyboardWidth: Ref<number>
  stepsPerBar: Ref<number>
  isChordStudioOpen: Ref<boolean>
  setupCanvasDpi: (width: number, height: number) => unknown
  requestDraw: () => void
  zoom: ZoomControls
}

export function usePianoRollNavigation(options: NavigationOptions) {
  const {
    notes,
    chords,
    chordVoicingMidis,
    effectiveMaxMidi,
    activeTrack,
    viewportWidth,
    viewportHeight,
    totalContentHeight,
    maxScrollX,
    scrollX,
    scrollY,
    stepWidth,
    rowHeight,
    keyboardWidth,
    stepsPerBar,
    setupCanvasDpi,
    requestDraw,
    zoom
  } = options
  function scrollToMidi(targetMidi: number): void {
    const targetRow = effectiveMaxMidi.value - targetMidi
    const centerOffset = viewportHeight.value / (2 * rowHeight.value)
    const desiredScrollRow = Math.max(0, targetRow - centerOffset)
    const maxScroll = Math.max(0, totalContentHeight.value - viewportHeight.value)
    scrollY.value = Math.max(0, Math.min(maxScroll, Math.round(desiredScrollRow * rowHeight.value)))
    requestDraw()
  }

  function scrollToNotes(): void {
    if (notes.value.length === 0) return
    const midis = notes.value.map((n) => n.midi)
    const avgMidi = Math.round(midis.reduce((a, b) => a + b, 0) / midis.length)
    scrollToMidi(avgMidi)
  }

  function scrollToChords(): void {
    if (chords.value.length === 0) return
    const midis = chordVoicingMidis.value
    if (midis.length > 0) {
      const minChordMidi = Math.min(...midis)
      const maxChordMidi = Math.max(...midis)
      const centerMidi = Math.round((minChordMidi + maxChordMidi) / 2)
      scrollToMidi(centerMidi)
    } else {
      scrollToMidi(48) // C3 register fallback
    }

    // Horizontal check: ensure the progression start is within the visible canvas
    if (chords.value.length > 0) {
      const minStartBar = Math.min(...chords.value.map((c) => c.startBar))
      const firstChordStep = minStartBar * stepsPerBar.value
      const chordPixelX = firstChordStep * stepWidth.value
      const visibleWidth = Math.max(0, viewportWidth.value - keyboardWidth.value)
      if (chordPixelX < scrollX.value || chordPixelX >= scrollX.value + visibleWidth) {
        scrollX.value = Math.max(0, Math.min(maxScrollX.value, chordPixelX))
      }
    }
    requestDraw()
  }

  const pendingScrollToChords = ref(false)

  function requestScrollToChords(): void {
    if (chords.value.length === 0) return
    pendingScrollToChords.value = true
    void nextTick(() => {
      requestAnimationFrame(() => {
        if (pendingScrollToChords.value) {
          scrollToChords()
          pendingScrollToChords.value = false
        }
      })
    })
  }

  // When Chord Studio opens, scroll existing chords into view
  watch(
    () => options.isChordStudioOpen.value,
    (isOpen, prevOpen) => {
      if (isOpen && !prevOpen && chords.value.length > 0) {
        requestScrollToChords()
      }
    }
  )

  // Track switching scrolls the active content into view
  watch(activeTrack, (newTrack) => {
    if (newTrack === 'chords' && chords.value.length > 0) {
      requestScrollToChords()
    } else if (newTrack === 'melody' && notes.value.length > 0) {
      scrollToNotes()
    }
  })

  const hasAutoFitted = ref(false)

  const { fitLoop } = zoom

  function autoFitToViewport(): void {
    fitLoop()
    if (options.isChordStudioOpen.value && chords.value.length > 0) {
      scrollToChords()
    } else if (notes.value.length > 0) {
      scrollToNotes()
    } else {
      scrollToMidi(60) // Center around Middle C (C4)
    }
  }

  // Sync viewport resize with high-DPI scaling
  watch([viewportWidth, viewportHeight], ([newWidth, newHeight]) => {
    if (newWidth > 0 && newHeight > 0) {
      setupCanvasDpi(newWidth, newHeight)
      if (!hasAutoFitted.value && newWidth > 100 && newHeight > 100) {
        hasAutoFitted.value = true
        autoFitToViewport()
      } else {
        if (pendingScrollToChords.value) {
          scrollToChords()
          pendingScrollToChords.value = false
        }
        requestDraw()
      }
    }
  })

  return { scrollToNotes, scrollToChords, scrollToMidi }
}
