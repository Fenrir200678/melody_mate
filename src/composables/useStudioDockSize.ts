import { computed, onMounted, ref, type Ref } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { STUDIO_MIN_ROLL_HEIGHT, type HeightDimensionConfig } from '@/config/ui-defaults'

export function useStudioDockSize(
  dock: Readonly<Ref<HTMLElement | null>>,
  preferredHeight: () => number,
  dimensions: HeightDimensionConfig
) {
  const workspace = ref<HTMLElement | null>(null)
  const workspaceHeight = ref<number | null>(null)

  onMounted(() => {
    workspace.value = dock.value?.closest<HTMLElement>('.daw-center-viewport') ?? null
    workspaceHeight.value = workspace.value?.clientHeight ?? null
  })
  useResizeObserver(workspace, ([entry]) => {
    if (entry) workspaceHeight.value = entry.contentRect.height
  })

  const maxDockHeight = computed(() => {
    if (workspaceHeight.value === null) return dimensions.maxHeight
    // Short windows share the available height instead of forcing competing minimums.
    const reservedRoll = Math.min(STUDIO_MIN_ROLL_HEIGHT, workspaceHeight.value / 2)
    return Math.max(0, Math.min(dimensions.maxHeight, workspaceHeight.value - reservedRoll))
  })
  const minDockHeight = computed(() => Math.min(dimensions.minHeight, maxDockHeight.value))
  const effectiveHeight = computed(() =>
    Math.max(minDockHeight.value, Math.min(preferredHeight(), maxDockHeight.value))
  )

  return { effectiveHeight, minDockHeight, maxDockHeight }
}
