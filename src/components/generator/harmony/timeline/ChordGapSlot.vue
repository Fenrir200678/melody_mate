<template>
  <button
    type="button"
    class="rounded-control text-daw-text-muted focus-visible:outline-daw-chord active:bg-daw-chord/10 absolute top-2 bottom-2 z-4 flex cursor-pointer items-center justify-center gap-1 overflow-hidden border border-dashed transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none"
    :class="
      dropTarget
        ? 'border-daw-chord bg-daw-chord/20 ring-daw-chord ring-2 ring-inset'
        : 'border-daw-border/50 hover:border-daw-chord/70 hover:text-daw-chord hover:bg-daw-chord/5'
    "
    :style="slotStyle"
    :title="label"
    :aria-label="label"
    @click.stop="emit('fill', gap)"
    @dblclick.stop
  >
    <Plus class="h-3.5 w-3.5 max-w-full shrink-0" aria-hidden="true" />
    <span v-if="gap.durationBars * barWidth >= CHORD_GAP_SLOT.labelMinWidthPx" class="text-micro font-medium"
      >Fill</span
    >
  </button>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Plus } from '@lucide/vue'
  import type { ProgressionGap } from '@/core/theory/progression-gaps'
  import { CHORD_GAP_SLOT } from '@/config/ui-defaults'

  const props = defineProps<{ gap: ProgressionGap; barWidth: number; dropTarget?: boolean }>()
  const emit = defineEmits<{ fill: [gap: ProgressionGap] }>()
  const label = computed(
    () =>
      `Fill gap at bar ${props.gap.startBar + 1} with chord (${props.gap.durationBars} ${props.gap.durationBars === 1 ? 'bar' : 'bars'})`
  )
  const slotStyle = computed(() => ({
    left: `${props.gap.startBar * props.barWidth + CHORD_GAP_SLOT.insetPx}px`,
    width: `${Math.max(0, props.gap.durationBars * props.barWidth - CHORD_GAP_SLOT.insetPx * 2)}px`
  }))
</script>
