<script setup lang="ts">
import Button from 'primevue/button'
import { useMelodyStore } from '@/stores/melody.store'
import { useCompositionStore } from '@/stores/composition.store'
import { useRhythmStore } from '@/stores/rhythm.store'
import { computed } from 'vue'

const melodyStore = useMelodyStore()
const compositionStore = useCompositionStore()
const rhythmStore = useRhythmStore()

const isGenerationDisabled = computed(() => {
  return !compositionStore.scaleName || !rhythmStore.rhythm || melodyStore.isGenerating
})
</script>

<template>
  <Button
    label="Generate Melody"
    severity="success"
    size="large"
    icon="pi pi-sparkles"
    :loading="melodyStore.isGenerating"
    :disabled="isGenerationDisabled"
    @click="melodyStore.generateMelody()"
    class="w-full"
  />
</template>
