<template>
  <canvas ref="canvas" width="32" height="16" class="take-sparkline shrink-0" aria-hidden="true" />
</template>

<script setup lang="ts">
  import { onMounted, ref, watch } from 'vue'
  import { useRafFn } from '@vueuse/core'
  import type { AppNote } from '@/core/schemas/note.schema'
  import { drawTakeSparkline } from '@/composables/takes/sparklineRender'

  const props = defineProps<{ notes: AppNote[]; musicalKey: string }>()
  const canvas = ref<HTMLCanvasElement | null>(null)
  const { pause, resume } = useRafFn(
    () => {
      if (canvas.value) drawTakeSparkline(canvas.value, props.notes, props.musicalKey)
      pause()
    },
    { immediate: false }
  )
  watch([() => props.notes, () => props.musicalKey], resume)
  onMounted(resume)
</script>
