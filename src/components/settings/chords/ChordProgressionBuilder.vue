<script setup lang="ts">
import { computed, watch } from 'vue'
import { useChordStore } from '@/stores/chord.store'
import { useChordProgression } from '@/composables/useChordProgression'
import { useCompositionStore } from '@/stores/composition.store'
import { useToast } from 'primevue/usetoast'
import ProgressionTypeSelector from './ProgressionTypeSelector.vue'
import CustomProgressionBuilder from './CustomProgressionBuilder.vue'
import PredefinedProgressionSelector from './PredefinedProgressionSelector.vue'

defineProps<{ disabled: boolean }>()

const chordStore = useChordStore()
const { loadPredefinedProgression } = useChordProgression()
const compositionStore = useCompositionStore()
const toast = useToast()

const selectedProgressionType = computed(() => chordStore.selectedProgressionType)

// Watch for key/scale changes to update progressions accordingly
watch(
  () => [compositionStore.key, compositionStore.scaleName],
  ([newKey, newScaleName], [oldKey, oldScaleName]) => {
    if (newKey !== oldKey || newScaleName !== oldScaleName) {
      if (chordStore.selectedProgressionType === 'custom') {
        if (chordStore.currentProgression && chordStore.currentProgression.length > 0) {
          chordStore.clearProgression()
          toast.add({
            severity: 'info',
            summary: 'Progression Reset',
            detail: 'Custom chord progression cleared due to key or scale change.',
            life: 3000
          })
        }
      } else if (chordStore.selectedProgressionType === 'predefined' && chordStore.selectedPredefinedProgressionName) {
        loadPredefinedProgression(chordStore.selectedPredefinedProgressionName)
        toast.add({
          severity: 'info',
          summary: 'Progression Updated',
          detail: 'Predefined chord progression updated to new key/scale.',
          life: 3000
        })
      }
    }
  }
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Progression Type Selector -->
    <ProgressionTypeSelector :disabled="disabled" />

    <!-- Custom Progression Builder -->
    <CustomProgressionBuilder v-if="selectedProgressionType === 'custom'" :disabled="disabled" />

    <!-- Predefined Progression Selector -->
    <PredefinedProgressionSelector v-else :disabled="disabled" />
  </div>
</template>
