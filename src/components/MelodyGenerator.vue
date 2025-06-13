<script setup lang="ts">
import Button from 'primevue/button'
import useMusicStore from '@/stores/music.store'
import { computed } from 'vue'

const store = useMusicStore()

const isGenerationDisabled = computed(() => {
  return !store.scaleName || !store.rhythm || store.isGenerating
})
</script>

<template>
  <Button
    label="Generate Melody"
    severity="success"
    size="large"
    icon="pi pi-sparkles"
    :loading="store.isGenerating"
    :disabled="isGenerationDisabled"
    @click="store.generateMelody()"
    class="w-full"
  />
</template>
