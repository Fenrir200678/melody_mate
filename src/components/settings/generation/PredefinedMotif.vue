<script setup lang="ts">
import { useGenerationStore } from '@/stores/generation.store'
import Checkbox from 'primevue/checkbox'

const generationStore = useGenerationStore()
</script>

<template>
  <div class="flex items-center justify-between gap-4">
    <div class="flex flex-col flex-1 min-w-0">
      <label for="use-motif-training-data" class="font-medium leading-tight">
        Implement Pre-defined Motifs<br />
        <span class="text-xs"> Tries to implement pre-defined motifs into the seed of the melody </span>
      </label>
    </div>
    <div class="flex-shrink-0 mt-1">
      <Checkbox
        v-model="generationStore.useMotifTrainingData"
        :binary="true"
        inputId="use-motif-training-data"
        @update:modelValue="generationStore.setUseMotifTrainingData"
      />
    </div>
  </div>
</template>
