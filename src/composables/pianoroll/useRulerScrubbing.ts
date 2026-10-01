import type { Ref } from 'vue'
import { STEPS_PER_BAR } from '@/core/schemas/project.schema'

export function useRulerScrubbing(
  trackRef: Ref<HTMLDivElement | null>,
  props: { stepWidth: number; scrollX: number; snapStep: number; bars: number },
  seekStep: (step: number) => void
) {
  let isScrubbing = false

  function handleSeek(e: PointerEvent): void {
    const track = trackRef.value
    if (!track || props.stepWidth <= 0) return

    const rect = track.getBoundingClientRect()
    const rawStep = (e.clientX - rect.left + props.scrollX) / props.stepWidth
    const snapped = props.snapStep > 0 ? Math.round(rawStep / props.snapStep) * props.snapStep : Math.floor(rawStep)
    seekStep(Math.max(0, Math.min(props.bars * STEPS_PER_BAR, Math.round(snapped * 10000) / 10000)))
  }

  function onTrackPointerDown(e: PointerEvent): void {
    isScrubbing = true
    trackRef.value?.setPointerCapture(e.pointerId)
    handleSeek(e)
  }

  function onTrackPointerMove(e: PointerEvent): void {
    if (isScrubbing) handleSeek(e)
  }

  function onTrackPointerUp(e: PointerEvent): void {
    if (!isScrubbing) return
    isScrubbing = false
    try {
      trackRef.value?.releasePointerCapture(e.pointerId)
    } catch {
      // Pointer capture may already be released after cancellation.
    }
  }

  return { onTrackPointerDown, onTrackPointerMove, onTrackPointerUp }
}
