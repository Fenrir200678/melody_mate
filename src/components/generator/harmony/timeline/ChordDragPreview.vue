<template>
  <div
    aria-hidden="true"
    class="pointer-events-none absolute inset-y-0 z-20"
    :style="{ left: `${geometry.left}px`, width: `${geometry.width}px` }"
  >
    <div class="border-daw-chord absolute top-0 bottom-0 -left-px border-l border-dashed" />
    <div
      class="rounded-control border-daw-chord bg-daw-chord/20 absolute inset-x-0 top-2 bottom-2 flex flex-col justify-between overflow-hidden border-2 border-dashed p-2"
    >
      <span class="text-daw-text truncate text-xs font-semibold">{{ chord.name }}</span>
      <span class="text-daw-text text-micro truncate font-mono"
        >{{ isCloning ? 'Copy' : 'Move' }} · {{ startBar + 1 }}</span
      >
      <span
        v-if="isCloning"
        class="bg-daw-chord text-daw-text rounded-chip absolute top-1 right-1 flex h-5 w-5 items-center justify-center font-mono text-xs font-bold"
        >+</span
      >
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { ChordEvent } from '@/core/schemas/chord.schema'
  import { calculateBlockGeometry } from '@/composables/harmony/timelineOps'

  const props = defineProps<{
    chord: ChordEvent
    startBar: number
    barWidth: number
    isCloning: boolean
  }>()
  const geometry = computed(() => calculateBlockGeometry(props.startBar, props.chord.durationBars, props.barWidth))
</script>
