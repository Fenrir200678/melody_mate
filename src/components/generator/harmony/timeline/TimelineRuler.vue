<template>
  <div
    class="border-daw-border bg-daw-surface/80 text-daw-text-muted text-micro flex h-6 shrink-0 items-center border-b font-mono select-none"
  >
    <div
      v-for="bar in bars"
      :key="bar"
      class="border-daw-border/30 text-2xs relative flex h-full shrink-0 items-center border-r"
      :style="{ width: `${barWidth}px` }"
    >
      <span class="text-daw-text px-2 font-bold tracking-tight">Bar {{ bar }}</span>
      <div class="text-daw-text-muted/40 text-micro pointer-events-none absolute inset-0 flex">
        <div class="w-1/4" />
        <div class="border-daw-border/10 flex w-1/4 items-center border-l pl-1">.2</div>
        <div class="border-daw-border/10 flex w-1/4 items-center border-l pl-1">.3</div>
        <div class="border-daw-border/10 flex w-1/4 items-center border-l pl-1">.4</div>
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
