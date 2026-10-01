<template>
  <div class="rhythm-studio__status flex min-h-5 shrink-0 items-center gap-2 px-3" aria-live="polite">
    <p v-if="store.error" class="rhythm-studio__error text-2xs">{{ store.error }}</p>
    <p v-else-if="!pattern.events.length" class="text-daw-text-muted text-2xs">
      Set an event on the grid to define the rhythm. Empty steps are rests.
    </p>
    <p v-else-if="store.isPreviewing" class="text-daw-pulse text-2xs">Previewing one pattern cycle</p>
    <p v-else-if="saveNotice" class="text-daw-pulse text-2xs">{{ saveNotice }}</p>
    <p v-else class="text-daw-text-muted text-micro">
      Enter or Space adds · drag or ←/→ moves · Shift+←/→ resizes · right-click or Delete removes
    </p>
    <span v-if="store.canGenerate === false" class="text-daw-text-muted text-micro ml-auto">
      Generate melody unavailable: add at least one event
    </span>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useRhythmStore } from '@/stores/rhythm.store'

  defineProps<{
    saveNotice?: string
  }>()

  const store = useRhythmStore()
  const pattern = computed(() => store.pattern)
</script>
