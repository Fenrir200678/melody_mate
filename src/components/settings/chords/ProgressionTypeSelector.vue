<script setup lang="ts">
import { computed } from 'vue'
import { useChordStore } from '@/stores/chord.store'
import { useChordProgression } from '@/composables/useChordProgression'
import SelectButton from 'primevue/selectbutton'

defineProps<{ disabled: boolean }>()

const chordStore = useChordStore()
const { setSelectedProgressionType } = useChordProgression()

const selectedProgressionType = computed({
  get: () => chordStore.selectedProgressionType,
  set: (value: 'custom' | 'predefined') => setSelectedProgressionType(value)
})

const progressionTypeOptions = [
  { label: 'Custom', value: 'custom' },
  { label: 'Predefined', value: 'predefined' }
]
</script>

<template>
  <div class="flex items-center justify-between">
    <label class="font-medium text-gray-200">Chord Progression Type</label>
    <SelectButton
      v-model="selectedProgressionType"
      :options="progressionTypeOptions"
      optionLabel="label"
      optionValue="value"
      :disabled="disabled"
    />
  </div>
</template>
