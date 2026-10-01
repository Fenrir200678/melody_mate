<template>
  <canvas ref="canvas" class="h-10 w-full" role="img" :aria-label="`Melody contour: ${rangeLabel}`" />
</template>

<script setup lang="ts">
  import { onMounted, ref, watch } from 'vue'
  import { useRafFn, useResizeObserver } from '@vueuse/core'
  import type { AppNote } from '@/core/schemas/note.schema'
  import { drawContour } from '@/composables/analysis/contourRender'

  const props = defineProps<{ notes: AppNote[]; totalSteps: number; rangeLabel: string }>()
  const canvas = ref<HTMLCanvasElement | null>(null)
  const { pause, resume } = useRafFn(
    () => {
      if (canvas.value) drawContour(canvas.value, props.notes, props.totalSteps)
      pause()
    },
    { immediate: false }
  )
  watch([() => props.notes, () => props.totalSteps], resume)
  useResizeObserver(canvas, resume)
  onMounted(resume)
</script>
