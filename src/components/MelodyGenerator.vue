<script setup lang="ts">
import { useMelodyGeneration } from '@/composables/useMelodyGeneration'
import Button from 'primevue/button'

const { generateMelody, isGenerating } = useMelodyGeneration()
</script>

<template>
  <div class="flex flex-col gap-4 w-full">
    <div class="flex justify-center w-full">
      <Button
        @click="generateMelody()"
        :loading="isGenerating"
        label="Generate Melody"
        icon="pi pi-sparkles"
        size="large"
        class="bg-primary-500 border-primary-500 hover:bg-primary-600 w-full"
      />
    </div>
  </div>
</template>
