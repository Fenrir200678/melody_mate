<template>
  <div
    class="pointer-events-auto absolute top-1 z-20 -translate-x-1/2"
    :style="{ left: `${left}px` }"
    :title="`Voice leading transition: ${distance}st`"
  >
    <span
      class="rounded-chip bg-daw-panel/90 text-daw-text-muted hover:text-daw-chord border-daw-border/80 text-micro py-0.2 border px-1 font-mono shadow-xs transition-colors"
    >
      {{ distance }}st
    </span>
  </div>
</template>

<script setup lang="ts">
  defineProps<{
    /** Mean semitone movement per voice across this chord boundary. */
    distance: number
    left: number
  }>()
</script>
