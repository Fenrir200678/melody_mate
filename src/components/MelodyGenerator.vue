<script setup lang="ts">
import { useMelodyGeneration } from '@/composables/useMelodyGeneration'
import Button from 'primevue/button'

const { generateMelody, isGenerating, downloadMidiFile, hasMelody } = useMelodyGeneration()
</script>

<template>
  <div class="w-full flex flex-col gap-2">
    <Button
      @click="generateMelody()"
      :loading="isGenerating"
      label="Generate"
      icon="pi pi-sparkles"
      size="large"
      class="w-full bg-primary-500 border-primary-500 hover:bg-primary-600"
    />
    <Button
      label="Download"
      icon="pi pi-download"
      :disabled="!hasMelody"
      @click="downloadMidiFile()"
      class="w-full"
      severity="success"
      size="large"
    />
  </div>
</template>
