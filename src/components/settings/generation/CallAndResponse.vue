<script setup lang="ts">
import { useGenerationStore } from '@/stores/generation.store'
import Checkbox from 'primevue/checkbox'

const generationStore = useGenerationStore()
</script>

<template>
  <div class="flex items-center justify-between gap-4">
    <div class="flex flex-col flex-1 min-w-0">
      <label for="use-call-and-response" class="font-medium leading-tight">
        Use Call and Response<br />
        <span class="text-xs break-words">
          When using motif repetition, the repeated motifs will be "spiced up" with transposition and inversion.
        </span>
      </label>
    </div>
    <div class="flex-shrink-0 mt-1">
      <Checkbox
        v-model="generationStore.useCallAndResponse"
        :binary="true"
        inputId="use-call-and-response"
        @update:modelValue="generationStore.setUseCallAndResponse"
      />
    </div>
  </div>
</template>
