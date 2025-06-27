<script setup lang="ts">
import Checkbox from 'primevue/checkbox'
import { useGenerationStore } from '@/stores/generation.store'

const props = defineProps<{ disabled: boolean }>()

const generationStore = useGenerationStore()
</script>

<template>
  <div class="flex items-center justify-between gap-4 mt-4">
    <div class="flex flex-col flex-1 min-w-0">
      <label for="end-with-root-note" class="font-medium leading-tight">
        End with root note<br />
        <span class="text-xs break-words"> Resolves the melody to the root note of the scale</span>
      </label>
    </div>
    <div class="flex-shrink-0 mt-1">
      <Checkbox
        v-model="generationStore.endWithRootNote"
        :binary="true"
        inputId="end-with-root-note"
        @update:modelValue="generationStore.setEndWithRootNote"
        :disabled="props.disabled"
      />
    </div>
  </div>
</template>
