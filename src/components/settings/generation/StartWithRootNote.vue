<script setup lang="ts">
import Checkbox from 'primevue/checkbox'
import { useGenerationStore } from '@/stores/generation.store'

const props = defineProps<{ disabled: boolean }>()

const generationStore = useGenerationStore()
</script>

<template>
  <div class="flex items-center justify-between gap-4">
    <div class="flex flex-col flex-1 min-w-0">
      <label for="start-with-root-note" class="font-medium leading-tight">
        Start with root note<br />
        <span class="text-xs break-words"> Start the melody with the root note of the scale</span>
      </label>
    </div>
    <div class="flex-shrink-0 mt-1">
      <Checkbox
        v-model="generationStore.startWithRootNote"
        :binary="true"
        inputId="start-with-root-note"
        @update:modelValue="generationStore.setStartWithRootNote"
        :disabled="props.disabled"
      />
    </div>
  </div>
</template>
