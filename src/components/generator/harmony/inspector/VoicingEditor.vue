<template>
  <div class="flex items-center gap-2">
    <div class="flex items-center gap-1">
      <span
        v-for="pitch in voicing"
        :key="pitch"
        class="bg-daw-surface rounded-chip text-2xs border-daw-border/80 text-daw-text border px-1.5 py-0.5 font-mono font-medium"
      >
        {{ pitch }}
      </span>
    </div>

    <DawStepper
      decrement-title="Transpose chord octave down"
      increment-title="Transpose chord octave up"
      @decrement="emit('transpose', -1)"
      @increment="emit('transpose', 1)"
    >
      <template #value>
        <span class="text-daw-text-muted text-micro px-1 font-mono">Oct</span>
      </template>
    </DawStepper>
  </div>
</template>

<script setup lang="ts">
  import DawStepper from '@/components/common/DawStepper.vue'

  defineProps<{
    voicing: readonly string[]
  }>()

  const emit = defineEmits<{
    transpose: [delta: number]
  }>()
</script>
