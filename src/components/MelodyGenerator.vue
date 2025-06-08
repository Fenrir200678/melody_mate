<script setup lang="ts">
import Button from 'primevue/button'
import useMusicStore from '@/stores/music.store'
import { computed } from 'vue'

const store = useMusicStore()

const isGenerationDisabled = computed(() => {
  return !store.scaleName || !store.rhythm || store.isGenerating
})

function handleGenerate() {
  store.generate()
}
</script>

<template>
  <div class="flex justify-center">
    <Button
      label="Generate Melody"
      size="large"
      icon="pi pi-sparkles"
      :loading="store.isGenerating"
      :disabled="isGenerationDisabled"
      @click="handleGenerate"
      class="w-full md:w-auto"
    />
  </div>
</template>
