<template>
  <button
    type="button"
    class="rounded-control border-daw-border/40 hover:border-daw-chord/60 text-daw-text-muted hover:text-daw-chord hover:bg-daw-chord/5 group absolute top-2 bottom-2 z-5 flex cursor-pointer flex-col items-center justify-center border border-dashed transition-all select-none"
    :style="ghostStyle"
    title="Add next chord (click or choose from palette on left)"
    @click="emit('add')"
  >
    <Plus class="h-4 w-4 transition-transform group-hover:scale-110" />
    <span class="text-micro mt-0.5 font-medium">Add Chord</span>
  </button>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Plus } from '@lucide/vue'

  const props = defineProps<{
    /** Bar the ghost slot starts at, i.e. the end of the last chord. */
    startBar: number
    barWidth: number
  }>()

  const emit = defineEmits<{
    add: []
  }>()

  /** 2px inset keeps the dashed border clear of the preceding block; 60px is the label floor. */
  const ghostStyle = computed(() => ({
    left: `${props.startBar * props.barWidth + 2}px`,
    width: `${Math.max(60, props.barWidth - 4)}px`
  }))
</script>
