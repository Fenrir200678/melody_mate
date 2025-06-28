<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useChordStore } from '@/stores/chord.store'
import { useChordProgression } from '@/composables/useChordProgression'
import { getAvailableChordProgressions } from '@/services/ChordService'
import Select from 'primevue/select'
import ChordCard from './ChordCard.vue'

defineProps<{ disabled: boolean }>()

const chordStore = useChordStore()
const { setSelectedPredefinedProgressionName, loadPredefinedProgression } = useChordProgression()

const selectedPredefinedProgressionName = computed({
  get: () => chordStore.selectedPredefinedProgressionName,
  set: (value: string) => setSelectedPredefinedProgressionName(value)
})

const currentProgression = computed(() => chordStore.currentProgression)
const availablePredefinedProgressions = getAvailableChordProgressions()

// Load the selected progression on mount if it's not already loaded
onMounted(() => {
  if (
    chordStore.selectedPredefinedProgressionName &&
    (!chordStore.currentProgression || chordStore.currentProgression.length === 0)
  ) {
    loadPredefinedProgression(chordStore.selectedPredefinedProgressionName)
  }
})
</script>

<template>
  <div :class="{ 'opacity-50 pointer-events-none': disabled }">
    <div class="flex items-center justify-between gap-4 mb-4">
      <label class="font-medium text-gray-200">Select Predefined Progression</label>
      <Select
        v-model="selectedPredefinedProgressionName"
        :options="availablePredefinedProgressions"
        placeholder="Choose a progression..."
        class="w-full md:w-1/2"
        :disabled="disabled"
      />
    </div>

    <!-- Preview of Selected Progression -->
    <div
      v-if="selectedPredefinedProgressionName && currentProgression.length > 0"
      class="flex flex-wrap gap-3 p-4 border border-zinc-700 rounded-lg bg-zinc-800"
    >
      <ChordCard
        v-for="(chord, index) in currentProgression"
        :key="`${chord.name}-${index}`"
        :chord="chord"
        :index="index"
        size="small"
        :show-roman-numeral="true"
        :show-position-numeral="true"
        class="pointer-events-none"
      />
    </div>
  </div>
</template>
