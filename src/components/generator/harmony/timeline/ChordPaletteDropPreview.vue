<template>
  <div
    aria-hidden="true"
    class="rounded-control border-daw-chord bg-daw-chord/20 text-daw-text pointer-events-none absolute top-2 bottom-2 z-20 flex flex-col justify-between overflow-hidden border-2 border-dashed p-2 transition-[left,width] duration-75 motion-reduce:transition-none"
    :style="{ left: `${target.startBar * barWidth}px`, width: `${target.durationBars * barWidth}px` }"
  >
    <span class="truncate text-xs font-semibold">{{ target.gapId ? 'Fill gap' : 'Insert chord' }}</span>
    <span class="text-micro truncate font-mono">Bar {{ target.startBar + 1 }} · {{ target.durationBars }}b</span>
  </div>
</template>

<script setup lang="ts">
  import type { PaletteDropTarget } from '@/composables/harmony/useChordPaletteDrop'

  defineProps<{ target: PaletteDropTarget; barWidth: number }>()
</script>
