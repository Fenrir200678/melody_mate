<script setup lang="ts">
import { useGenerationStore } from '@/stores/generation.store'
import SelectButton from 'primevue/selectbutton'

const generationStore = useGenerationStore()

const contourOptions = [
  { label: 'Arc', value: 'arc' },
  { label: 'Ascending', value: 'ascending' },
  { label: 'Descending', value: 'descending' },
  { label: 'Random', value: 'random' }
]

function handleContourChange(value: string) {
  generationStore.setMelodicContour(value)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-col flex-1 min-w-0">
      <label class="font-medium">Melodic Contour</label>
      <span class="text-xs break-words mb-2">
        Guides the overall shape of the melody over its full duration.
      </span>
    </div>
    <SelectButton
      :model-value="generationStore.melodicContour"
      :options="contourOptions"
      option-label="label"
      option-value="value"
      @update:modelValue="handleContourChange"
      aria-labelledby="melodic-contour-label"
    />
  </div>
</template>
