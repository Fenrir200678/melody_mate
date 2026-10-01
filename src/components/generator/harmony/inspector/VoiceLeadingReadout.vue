<template>
  <div class="text-micro flex items-center gap-1 font-mono">
    <span
      v-if="prevDistance !== null"
      class="rounded-chip bg-daw-surface text-daw-text-muted border-daw-border/70 border px-1.5 py-0.5"
      :title="`Voice leading movement from previous chord: ${prevDistance} semitones`"
    >
      ← {{ prevDistance }}st
    </span>
    <span
      v-if="nextDistance !== null"
      class="rounded-chip bg-daw-surface text-daw-text-muted border-daw-border/70 border px-1.5 py-0.5"
      :title="`Voice leading movement to next chord: ${nextDistance} semitones`"
    >
      {{ nextDistance }}st →
    </span>
  </div>
</template>

<script setup lang="ts">
  defineProps<{
    prevDistance: number | null
    nextDistance: number | null
  }>()
</script>
