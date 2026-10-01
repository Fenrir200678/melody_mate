import { computed, ref, type Ref } from 'vue'
import {
  calculateFitBarWidth,
  calculateZoomPercentage,
  clampBarWidth,
  MAX_BAR_WIDTH,
  MIN_BAR_WIDTH,
  ZOOM_STEP
} from './timelineOps'

export interface UseTimelineZoomOptions {
  containerWidth: Ref<number>
  totalBars: Ref<number>
}

/**
 * Horizontal bar zoom. The base width follows the viewport, and the user offset is clamped so
 * zooming can never push a bar outside its readable bounds.
 */
export function useTimelineZoom({ containerWidth, totalBars }: UseTimelineZoomOptions) {
  const userZoomOffset = ref(0)

  const baseBarWidth = computed(() => calculateFitBarWidth(containerWidth.value, totalBars.value))
  const barWidth = computed(() => clampBarWidth(baseBarWidth.value + userZoomOffset.value))
  const zoomPercentage = computed(() => calculateZoomPercentage(barWidth.value, baseBarWidth.value))

  function zoomIn(): void {
    userZoomOffset.value = Math.min(MAX_BAR_WIDTH - baseBarWidth.value, userZoomOffset.value + ZOOM_STEP)
  }

  function zoomOut(): void {
    userZoomOffset.value = Math.max(MIN_BAR_WIDTH - baseBarWidth.value, userZoomOffset.value - ZOOM_STEP)
  }

  function resetZoom(): void {
    userZoomOffset.value = 0
  }

  return { barWidth, baseBarWidth, zoomPercentage, zoomIn, zoomOut, resetZoom, MIN_BAR_WIDTH, MAX_BAR_WIDTH }
}
