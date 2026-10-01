<template>
  <div class="flex flex-col gap-0.5">
    <div class="flex items-center gap-1.5">
      <span class="h-1.5 w-1.5 rounded-full" :class="theme.dot" />
      <span class="text-daw-text-muted text-micro font-semibold tracking-wider uppercase">
        {{ SECTION_LABELS[tone] }}
      </span>
    </div>
    <div class="grid gap-1" :class="theme.grid">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { HarmonicFunction } from '@/core/theory/chord-function'
  import { PALETTE_CARD_THEME, SECTION_LABELS } from '@/utils/harmony/chordFunctionTheme'

  const props = defineProps<{
    tone: HarmonicFunction
  }>()

  const theme = computed(() => PALETTE_CARD_THEME[props.tone])
</script>
