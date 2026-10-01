import { shallowRef, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { CHORD_PALETTE_DROP } from '@/config/ui-defaults'
import type { ProgressionGap } from '@/core/theory/progression-gaps'
import { useHarmonyStore } from '@/stores/harmony.store'
import { useUiStore } from '@/stores/ui.store'
import { useChordInsertion } from './useChordInsertion'
import { isChordPaletteDrag, readChordPaletteDrag } from '@/utils/harmony/chordPaletteDrag'

export interface PaletteDropTarget {
  startBar: number
  durationBars: number
  gapId: string | null
}

export interface PaletteDropGeometry {
  viewportLeft: number
  scrollLeft: number
  barWidth: number
  totalBars: number
  defaultDuration: number
  gaps: readonly ProgressionGap[]
}

export function calculatePaletteDropTarget(clientX: number, geometry: PaletteDropGeometry): PaletteDropTarget | null {
  const { viewportLeft, scrollLeft, barWidth, totalBars, defaultDuration, gaps } = geometry
  if (
    ![clientX, viewportLeft, scrollLeft, barWidth, totalBars, defaultDuration].every(Number.isFinite) ||
    barWidth <= 0 ||
    totalBars <= 0 ||
    defaultDuration <= 0
  )
    return null

  const position = Math.max(0, Math.min(totalBars, (clientX - viewportLeft + scrollLeft) / barWidth))
  // Resolve gaps before snapping so the right edge cannot round into the following chord.
  const gap = gaps.find(
    (candidate) => position >= candidate.startBar && position < candidate.startBar + candidate.durationBars
  )
  if (gap) return { startBar: gap.startBar, durationBars: gap.durationBars, gapId: gap.id }

  const snap = CHORD_PALETTE_DROP.snapBars
  const startBar = Math.max(0, Math.min(totalBars, Math.round(position / snap) * snap))
  return { startBar, durationBars: defaultDuration, gapId: null }
}

export function useChordPaletteDrop(options: {
  viewport: () => HTMLElement | null
  barWidth: () => number
  totalBars: () => number
  gaps: () => readonly ProgressionGap[]
}) {
  const harmonyStore = useHarmonyStore()
  const uiStore = useUiStore()
  const { insertChordAt } = useChordInsertion()
  const dropPreview = shallowRef<PaletteDropTarget | null>(null)
  const clearDropPreview = () => {
    dropPreview.value = null
  }

  function targetFor(event: DragEvent) {
    const viewport = options.viewport()
    if (!viewport) return null
    return calculatePaletteDropTarget(event.clientX, {
      viewportLeft: viewport.getBoundingClientRect().left + viewport.clientLeft,
      scrollLeft: viewport.scrollLeft,
      barWidth: options.barWidth(),
      totalBars: options.totalBars(),
      defaultDuration: harmonyStore.defaultChordDuration,
      gaps: options.gaps()
    })
  }

  function onPaletteDragOver(event: DragEvent): void {
    if (!isChordPaletteDrag(event.dataTransfer)) return
    event.preventDefault()
    event.dataTransfer!.dropEffect = 'copy'
    dropPreview.value = targetFor(event)
  }

  function onPaletteDragLeave(event: DragEvent): void {
    const lane = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && lane.contains(event.relatedTarget)) return
    clearDropPreview()
  }

  function onPaletteDrop(event: DragEvent): void {
    clearDropPreview()
    if (!isChordPaletteDrag(event.dataTransfer)) return
    event.preventDefault()
    const payload = readChordPaletteDrag(event.dataTransfer)
    const target = targetFor(event)
    if (!payload || !target) return
    uiStore.setActiveTrack('chords')
    insertChordAt(payload.chord, payload.mode, target.startBar, target.durationBars, {
      preserveExisting: target.gapId !== null
    })
  }

  useEventListener(window, 'dragend', clearDropPreview)
  useEventListener(window, 'drop', clearDropPreview)
  watch([options.barWidth, options.totalBars, options.gaps, () => harmonyStore.defaultChordDuration], clearDropPreview)

  return { dropPreview, onPaletteDragOver, onPaletteDragLeave, onPaletteDrop }
}
