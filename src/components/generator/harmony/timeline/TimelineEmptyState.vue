<template>
  <div
    class="text-daw-text-muted pointer-events-none absolute inset-4 flex flex-col items-center justify-center gap-2 text-center text-xs"
  >
    <p class="text-daw-text font-medium">No chords in progression.</p>
    <p class="text-micro text-daw-text-muted">
      Choose from the Diatonic Palette, add the tonic chord, or double-click an empty bar.
    </p>
    <DawButton
      class="pointer-events-auto mt-1"
      size="md"
      appearance="surface"
      variant="chord"
      :icon="Plus"
      @click="emit('addTonic')"
    >
      Add Tonic (I)
    </DawButton>
  </div>
</template>

<script setup lang="ts">
  import { Plus } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'

  const emit = defineEmits<{
    addTonic: []
  }>()
</script>
