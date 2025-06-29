<script setup lang="ts">
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import { ref } from 'vue'

const props = defineProps<{
  useCustomRhythm: boolean
  numberOfBars: number
  handleToggleCustomRhythm: (value: boolean) => void
  handleClearCustomRhythm: () => void
  handleTrashDragOver: (event: DragEvent) => void
  handleTrashDrop: (event: DragEvent) => void
  handleNumberOfBarsChange: (value: number) => void
}>()

const barOptions = ref([
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 }
])
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div class="flex items-center gap-4">
      <label for="useCustomRhythm" class="text-sm font-medium">Custom Rhythm</label>
      <ToggleSwitch
        :modelValue="props.useCustomRhythm"
        inputId="useCustomRhythm"
        @update:modelValue="props.handleToggleCustomRhythm"
        class="align-middle"
      />
    </div>

    <div class="flex items-center gap-4">
      <label for="numberOfBars" class="text-sm font-medium">Bars</label>
      <SelectButton
        :modelValue="props.numberOfBars"
        :options="barOptions"
        optionLabel="label"
        optionValue="value"
        @update:modelValue="props.handleNumberOfBarsChange"
        aria-labelledby="numberOfBars"
      />
    </div>

    <div class="flex items-center gap-3 sm:gap-2">
      <!-- Trash Zone -->
      <div
        class="flex items-center justify-center w-10 h-10 rounded-lg border-2 border-dashed border-red-400 text-red-400 hover:bg-red-400/10 transition-colors"
        @dragover="props.handleTrashDragOver"
        @drop="props.handleTrashDrop"
        title="Drag notes here to delete"
      >
        <i class="pi pi-trash text-sm"></i>
      </div>
      <Button
        label="Clear All"
        icon="pi pi-replay"
        class="p-button-text p-button-sm"
        @click="props.handleClearCustomRhythm"
      />
    </div>
  </div>
</template>
