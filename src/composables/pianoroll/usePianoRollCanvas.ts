import { computed, onMounted, onUnmounted, ref, toValue, watch, type ComputedRef, type Ref } from 'vue'
import { useRafFn } from '@vueuse/core'
import { Note } from 'tonal'
import { DEFAULT_CANVAS_GRID, DEFAULT_UI_PREFERENCES } from '@/config/ui-defaults'
import type { ChordEvent } from '@/core/schemas/chord.schema'
import type { AppNote } from '@/core/schemas/note.schema'
import { midiToPitch } from '@/core/theory/scale.engine'
import {
  calculateMaxScrollX,
  getViewportBounds,
  midiToPixelY,
  pixelXToStep,
  pixelYToMidi,
  setupCanvasDpi,
  stepToPixelX,
  type ViewportBounds
} from './geometry'
import { calculateHorizontalZoom, calculateVerticalZoom } from './zoomOps'
import {
  drawChordNotesLayer,
  drawGhostChordLayer,
  drawGhostNotesLayer,
  drawGridLayer,
  drawKeyboardLayer,
  drawLoopRegionLayer,
  drawNotesLayer,
  drawPlayheadLayer,
  type RenderContext
} from './renderLayers'
import { createPlayheadFollow } from './usePlayheadFollow'
import { drawMotifSectionsLayer } from './motifSectionRender'
import { drawWorkRangeGripsLayer, drawWorkRangeLayer } from './workRangeRender'
import type { WorkRange } from '@/core/generator/work-range'

export type { ViewportBounds }
export { calculateMaxScrollX, setupCanvasDpi }

export type PianoRollTrack = 'melody' | 'chords'

export interface UsePianoRollCanvasOptions {
  notes: Ref<AppNote[]> | ComputedRef<AppNote[]>
  chords: Ref<ChordEvent[]> | ComputedRef<ChordEvent[]>
  rootKey: Ref<string> | ComputedRef<string>
  scale: Ref<string> | ComputedRef<string>
  bars: Ref<number> | ComputedRef<number>
  bpm?: Ref<number> | ComputedRef<number>
  snapStep?: Ref<number> | ComputedRef<number> | number
  isScaleLocked?: Ref<boolean> | ComputedRef<boolean> | boolean
  isPlaying: Ref<boolean> | ComputedRef<boolean>
  currentStep: Ref<number> | ComputedRef<number>
  selectedNoteIds?: Ref<string[]> | ComputedRef<string[]>
  sectionLetters?: Ref<string[]> | ComputedRef<string[]>
  selectedChordNoteIds?: Ref<string[]> | ComputedRef<string[]>
  dragPreviewNotes?: Ref<AppNote[]> | ComputedRef<AppNote[]>
  dragPreviewChords?: Ref<ChordEvent[]> | ComputedRef<ChordEvent[]>
  activeTrack?: Ref<PianoRollTrack> | ComputedRef<PianoRollTrack> | PianoRollTrack
  stepsPerBar?: Ref<number> | ComputedRef<number> | number
  lassoRect?:
    | Ref<{ x: number; y: number; width: number; height: number } | null>
    | ComputedRef<{ x: number; y: number; width: number; height: number } | null>
  disableInternalPointerDown?: boolean
  minMidi?: Ref<number> | number
  maxMidi?: Ref<number> | number
  initialRowHeight?: number
  initialStepWidth?: number
  initialScrollX?: number
  initialScrollY?: number
  keyboardWidth?: number
  workRange?: Ref<WorkRange> | ComputedRef<WorkRange>
  loopStartStep?: Ref<number> | ComputedRef<number> | number
  loopEndStep?: Ref<number> | ComputedRef<number> | number
  isLooping?: Ref<boolean> | ComputedRef<boolean> | boolean
  // Non-reactive continuous playhead clock (fractional 16th steps) pulled per frame
  playhead?: { step: number }
  followPlayhead?: Ref<boolean> | ComputedRef<boolean>
  onPlayheadFrame?: (step: number) => void
  onAuditionNote?: (pitch: string) => void
  onSelectNote?: (noteId: string, isShift: boolean) => void
  onSeekStep?: (step: number) => void
}

/**
 * Comprehensive composable managing piano-roll canvas state, rendering pipeline,
 * and high-performance user navigation. Rendering itself is delegated to the pure
 * layer painters in ./renderLayers; follow-scroll lives in ./usePlayheadFollow.
 */
export function usePianoRollCanvas(canvasRef: Ref<HTMLCanvasElement | null>, options: UsePianoRollCanvasOptions) {
  // Viewport dimensions & offsets
  const scrollX = ref(options.initialScrollX ?? DEFAULT_CANVAS_GRID.scrollX)
  const scrollY = ref(options.initialScrollY ?? DEFAULT_CANVAS_GRID.scrollY)
  const stepWidth = ref(options.initialStepWidth ?? DEFAULT_CANVAS_GRID.stepWidth)
  const rowHeight = ref(options.initialRowHeight ?? DEFAULT_CANVAS_GRID.rowHeight)
  const keyboardWidth = ref(options.keyboardWidth ?? 56)
  const minMidi = computed(() => toValue(options.minMidi) ?? 24) // C1
  const maxMidi = computed(() => toValue(options.maxMidi) ?? 108) // C8

  const snapStep = ref(toValue(options.snapStep) ?? DEFAULT_UI_PREFERENCES.snapStep)
  const selectedNoteIds = ref<string[]>(toValue(options.selectedNoteIds) ?? [])

  // Sync scrollY to center roughly on C4 (MIDI 60) on startup if initialScrollY was not specified
  if (options.initialScrollY === undefined) {
    const initialCenteredMidi = 60
    const initialScrollRow = Math.max(0, maxMidi.value - initialCenteredMidi - 6)
    scrollY.value = initialScrollRow * rowHeight.value
  }

  let rafId: number | null = null

  // Clicked piano key that briefly highlights as visual feedback. Kept out of the reactive
  const flashedKeyMidi = ref<number | null>(null)
  let flashTimeoutId: ReturnType<typeof setTimeout> | null = null

  function flashKey(midi: number): void {
    flashedKeyMidi.value = midi
    requestDraw()
    if (flashTimeoutId) clearTimeout(flashTimeoutId)
    flashTimeoutId = setTimeout(() => {
      flashTimeoutId = null
      flashedKeyMidi.value = null
      requestDraw()
    }, 180)
  }

  function getCanvasWidth(): number {
    const canvas = canvasRef.value
    if (!canvas) return 0
    return parseFloat(canvas.style.width) || canvas.width || 0
  }

  function getMaxScrollX(curStepWidth = stepWidth.value): number {
    return calculateMaxScrollX(getCanvasWidth(), curStepWidth, toValue(options.bars), keyboardWidth.value)
  }

  function clampScrollX(val: number, curStepWidth = stepWidth.value): number {
    const maxScroll = getMaxScrollX(curStepWidth)
    return Math.max(0, Math.min(maxScroll, val))
  }

  // Ensure scrollX remains valid when bars count or step width changes
  watch([() => toValue(options.bars), stepWidth], () => {
    scrollX.value = clampScrollX(scrollX.value)
  })

  // --- Live playhead clock & follow-scroll (pulled per frame; no Vue reactivity) ---

  function resolvedPlayheadStep(): number {
    // While playing the markRaw clock supplies sub-step motion; when stopped/seeking the
    // integer store step is authoritative so the playhead rests exactly on grid ticks.
    if (options.playhead && toValue(options.isPlaying)) {
      return options.playhead.step
    }
    return toValue(options.currentStep)
  }

  const playheadFollow = createPlayheadFollow({
    getViewportWidth: getCanvasWidth,
    getStepWidth: () => stepWidth.value,
    getKeyboardWidth: () => keyboardWidth.value,
    getBars: () => toValue(options.bars),
    getScrollX: () => scrollX.value,
    setScrollX: (value) => {
      scrollX.value = value
    },
    isFollowEnabled: () => toValue(options.followPlayhead) ?? false
  })

  /**
   * Request render on the next animation frame for stationary states.
   */
  function requestDraw(): void {
    if (typeof window === 'undefined') return
    if (rafId !== null) return
    rafId = window.requestAnimationFrame(() => {
      rafId = null
      draw()
    })
  }

  /**
   * Builds the immutable per-frame RenderContext and paints all canvas layers in order.
   */
  function draw(): void {
    const canvas = canvasRef.value
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = parseFloat(canvas.style.width) || canvas.width
    const height = parseFloat(canvas.style.height) || canvas.height
    if (width <= 0 || height <= 0) return

    // Keep scrollX strictly within valid bounds
    const maxScrollX = getMaxScrollX(stepWidth.value)
    if (scrollX.value > maxScrollX) {
      scrollX.value = maxScrollX
    }

    const curBars = toValue(options.bars)
    const totalProjectSteps = curBars * 16
    const totalProjectWidth = keyboardWidth.value + totalProjectSteps * stepWidth.value

    const rc: RenderContext = {
      ctx,
      t: {
        width,
        height,
        stepWidth: stepWidth.value,
        rowHeight: rowHeight.value,
        scrollX: scrollX.value,
        scrollY: scrollY.value,
        keyboardWidth: keyboardWidth.value,
        minMidi: minMidi.value,
        maxMidi: maxMidi.value
      },
      bounds: getViewportBounds(
        width,
        height,
        stepWidth.value,
        rowHeight.value,
        scrollX.value,
        scrollY.value,
        keyboardWidth.value,
        maxMidi.value
      ),
      notes: toValue(options.notes),
      chords: toValue(options.chords),
      rootKey: toValue(options.rootKey),
      scale: toValue(options.scale),
      rootPc: Note.pitchClass(toValue(options.rootKey)) || toValue(options.rootKey),
      bars: curBars,
      totalProjectSteps,
      stepsPerBar: toValue(options.stepsPerBar) ?? 16,
      activeTrack: toValue(options.activeTrack) ?? 'melody',
      isProjectShorterThanScreen: totalProjectWidth < width,
      projectEndX:
        Math.round(stepToPixelX(totalProjectSteps, stepWidth.value, scrollX.value, keyboardWidth.value)) + 0.5,
      isPlaying: toValue(options.isPlaying),
      playheadStep: resolvedPlayheadStep(),
      selectedIds: toValue(options.selectedNoteIds) ?? selectedNoteIds.value,
      sectionLetters: toValue(options.sectionLetters) ?? [],
      selectedChordNoteIds: toValue(options.selectedChordNoteIds) ?? [],
      isScaleLocked: toValue(options.isScaleLocked) ?? false,
      dragNotes: toValue(options.dragPreviewNotes) ?? [],
      dragChords: toValue(options.dragPreviewChords) ?? [],
      lassoRect: toValue(options.lassoRect) ?? null,
      flashedKeyMidi: flashedKeyMidi.value,
      workRange: toValue(options.workRange),
      loopStartStep: toValue(options.loopStartStep),
      loopEndStep: toValue(options.loopEndStep),
      isLooping: toValue(options.isLooping)
    }

    drawGridLayer(rc)
    drawMotifSectionsLayer(rc)
    drawWorkRangeLayer(rc)
    drawLoopRegionLayer(rc)
    if (rc.activeTrack === 'melody') {
      drawGhostChordLayer(rc)
      drawNotesLayer(rc)
    } else {
      drawGhostNotesLayer(rc)
      drawChordNotesLayer(rc)
    }
    drawWorkRangeGripsLayer(rc)
    drawKeyboardLayer(rc)
    drawPlayheadLayer(rc)
  }

  // Active Playback: VueUse useRafFn running only during playback
  const { pause: pauseRaf, resume: resumeRaf } = useRafFn(
    () => {
      const playheadStep = resolvedPlayheadStep()
      options.onPlayheadFrame?.(playheadStep)
      playheadFollow.update(playheadStep)
      draw()
    },
    { immediate: false }
  )

  watch(
    () => toValue(options.isPlaying),
    (isPlayingVal) => {
      if (isPlayingVal) {
        playheadFollow.rearm(resolvedPlayheadStep())
        resumeRaf()
      } else {
        pauseRaf()
        requestDraw()
      }
    },
    { immediate: true }
  )

  // React to reactive state changes when stationary.
  // Note/selection arrays are replaced by reference on every mutation (immutability contract
  // in stores + composables), so a shallow watcher is sufficient and avoids deep traversal.
  watch(
    [
      () => toValue(options.notes),
      () => toValue(options.chords),
      () => toValue(options.rootKey),
      () => toValue(options.scale),
      () => toValue(options.isScaleLocked),
      () => toValue(options.bars),
      () => toValue(options.currentStep),
      () => toValue(options.selectedNoteIds),
      () => toValue(options.sectionLetters),
      () => toValue(options.selectedChordNoteIds),
      () => toValue(options.dragPreviewNotes),
      () => toValue(options.dragPreviewChords),
      () => toValue(options.activeTrack),
      () => toValue(options.stepsPerBar),
      () => toValue(options.lassoRect),
      () => toValue(options.workRange),
      () => toValue(options.loopStartStep),
      () => toValue(options.loopEndStep),
      () => toValue(options.isLooping),
      minMidi,
      maxMidi,
      scrollX,
      scrollY,
      stepWidth,
      rowHeight
    ],
    () => {
      if (!toValue(options.isPlaying)) {
        requestDraw()
      }
    }
  )

  /**
   * 2D Navigation Wheel Handler (Pan, Alt+Wheel Zoom, Shift+Wheel Fast Pan, Keyboard/Ctrl+Wheel Vertical Zoom).
   */
  function handleWheel(e: WheelEvent): void {
    e.preventDefault()

    const canvas = canvasRef.value
    const height = canvas ? parseFloat(canvas.style.height) || canvas.height : 600
    const width = canvas ? parseFloat(canvas.style.width) || canvas.width : 800

    const isOverKeyboard = e.offsetX < keyboardWidth.value
    const isVerticalZoomModifier = e.ctrlKey || e.metaKey || (e.altKey && e.shiftKey)

    if (isOverKeyboard || isVerticalZoomModifier) {
      // Vertical zoom centered on pointer pitch
      const res = calculateVerticalZoom({
        deltaY: e.deltaY,
        oldRowHeight: rowHeight.value,
        mouseY: e.offsetY,
        scrollY: scrollY.value,
        maxMidi: maxMidi.value,
        minMidi: minMidi.value,
        viewportHeight: height
      })

      if (res.newRowHeight !== rowHeight.value || res.newScrollY !== scrollY.value) {
        rowHeight.value = res.newRowHeight
        scrollY.value = res.newScrollY
        requestDraw()
      }
    } else if (e.altKey) {
      // Horizontal zoom centered on pointer
      playheadFollow.suspend()
      const res = calculateHorizontalZoom({
        deltaY: e.deltaY,
        oldStepWidth: stepWidth.value,
        mouseX: e.offsetX,
        scrollX: scrollX.value,
        keyboardWidth: keyboardWidth.value,
        viewportWidth: width,
        bars: toValue(options.bars) ?? 4
      })

      if (res.newStepWidth !== stepWidth.value || res.newScrollX !== scrollX.value) {
        stepWidth.value = res.newStepWidth
        scrollX.value = res.newScrollX
        requestDraw()
      }
    } else if (e.shiftKey) {
      // Fast horizontal scroll
      playheadFollow.suspend()
      scrollX.value = clampScrollX(scrollX.value + e.deltaY)
      requestDraw()
    } else {
      // 2D Pan
      if (e.deltaX !== 0) {
        playheadFollow.suspend()
        scrollX.value = clampScrollX(scrollX.value + e.deltaX)
      }

      const totalRows = maxMidi.value - minMidi.value + 1
      const totalContentHeight = totalRows * rowHeight.value
      const maxScrollY = Math.max(0, totalContentHeight - height)
      scrollY.value = Math.max(0, Math.min(maxScrollY, scrollY.value + e.deltaY))
      requestDraw()
    }
  }

  /**
   * Pointer down handler for note auditioning on the sticky keyboard and note selection.
   */
  function handlePointerDown(e: MouseEvent): void {
    if (e.offsetX < keyboardWidth.value) {
      const midi = pixelYToMidi(e.offsetY, rowHeight.value, scrollY.value, maxMidi.value)
      options.onAuditionNote?.(midiToPitch(midi))
      return
    }

    const currentNotes = toValue(options.notes)
    const currentSnap = toValue(options.snapStep) ?? snapStep.value
    const step = pixelXToStep(e.offsetX, stepWidth.value, scrollX.value, keyboardWidth.value, currentSnap)
    const midi = pixelYToMidi(e.offsetY, rowHeight.value, scrollY.value, maxMidi.value)

    const clickedNote = currentNotes.find((n) => n.midi === midi && step >= n.step && step < n.step + n.durationSteps)

    if (clickedNote) {
      options.onSelectNote?.(clickedNote.id, e.shiftKey)
    }
  }

  onMounted(() => {
    const canvas = canvasRef.value
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false })
      if (!options.disableInternalPointerDown) {
        canvas.addEventListener('mousedown', handlePointerDown)
      }
    }
    requestDraw()
  })

  onUnmounted(() => {
    if (rafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(rafId)
      rafId = null
    }
    if (flashTimeoutId) {
      clearTimeout(flashTimeoutId)
      flashTimeoutId = null
    }
    pauseRaf()

    const canvas = canvasRef.value
    if (canvas) {
      canvas.removeEventListener('wheel', handleWheel)
      if (!options.disableInternalPointerDown) {
        canvas.removeEventListener('mousedown', handlePointerDown)
      }
    }
  })

  return {
    scrollX,
    scrollY,
    stepWidth,
    rowHeight,
    keyboardWidth,
    minMidi,
    maxMidi,
    snapStep,
    selectedNoteIds,
    draw,
    requestDraw,
    flashKey,
    getMaxScrollX,
    clampScrollX,
    suspendFollow: playheadFollow.suspend,
    resolvedPlayheadStep,
    setupCanvasDpi: (width: number, height: number) => {
      if (canvasRef.value) {
        const result = setupCanvasDpi(canvasRef.value, width, height)
        scrollX.value = clampScrollX(scrollX.value)
        return result
      }
      return { ctx: null, dpr: 1 }
    },
    stepToPixelX: (step: number) => stepToPixelX(step, stepWidth.value, scrollX.value, keyboardWidth.value),
    pixelXToStep: (x: number, snap?: number) =>
      pixelXToStep(x, stepWidth.value, scrollX.value, keyboardWidth.value, snap ?? snapStep.value),
    midiToPixelY: (midi: number) => midiToPixelY(midi, rowHeight.value, scrollY.value, maxMidi.value),
    pixelYToMidi: (y: number) => pixelYToMidi(y, rowHeight.value, scrollY.value, maxMidi.value)
  }
}
