<script setup lang="ts">
import useMusicStore from '@/stores/music.store'
import Checkbox from 'primevue/checkbox'

const store = useMusicStore()
</script>

<template>
  <div class="flex items-start justify-between gap-4">
    <div class="flex flex-col flex-1 min-w-0">
      <label for="use-motif-training-data" class="font-medium"> Implement Pre-defined Motifs </label>
      <span class="text-xs"> Tries to implement pre-defined motifs into the seed of the melody </span>
    </div>
    <div class="flex-shrink-0 mt-1">
      <Checkbox
        v-model="store.useMotifTrainingData"
        :binary="true"
        inputId="use-motif-training-data"
        @update:modelValue="store.setUseMotifTrainingData"
      />
    </div>
  </div>
</template>
