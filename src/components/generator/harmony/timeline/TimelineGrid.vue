<template>
  <div class="pointer-events-none absolute inset-0 flex">
    <div
      v-for="bar in bars"
      :key="bar"
      class="border-daw-border/30 relative h-full shrink-0 border-r"
      :class="[bar % 2 === 0 ? 'bg-daw-surface/10' : 'bg-transparent']"
      :style="{ width: `${barWidth}px` }"
    >
      <div class="absolute inset-0 flex">
        <div class="w-1/4" />
        <div class="border-daw-border/10 h-full w-1/4 border-l" />
        <div class="border-daw-border/10 h-full w-1/4 border-l" />
        <div class="border-daw-border/10 h-full w-1/4 border-l" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  defineProps<{
    bars: number
    barWidth: number
  }>()
</script>
