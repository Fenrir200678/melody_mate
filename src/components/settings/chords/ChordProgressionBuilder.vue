<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { useChordStore } from '@/stores/chord.store'
import { useChordProgression } from '@/composables/useChordProgression'
import { useCompositionStore } from '@/stores/composition.store'
import { useDropZone, templateRef } from '@vueuse/core'
// @ts-expect-error - Sortable.js types
import Sortable from 'sortablejs'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import Select from 'primevue/select'
import DiatonicChordPalette from './DiatonicChordPalette.vue'
import ChordCard from './ChordCard.vue'
import { getAvailableChordProgressions } from '@/services/ChordService'
import { useToast } from 'primevue/usetoast'

const props = defineProps<{ disabled: boolean }>()

const chordStore = useChordStore()
const { loadPredefinedProgression } = useChordProgression()
const compositionStore = useCompositionStore()
const toast = useToast()

const currentProgression = computed(() => chordStore.currentProgression)
const selectedProgressionType = computed({
  get: () => chordStore.selectedProgressionType,
  set: (value: 'custom' | 'predefined') => chordStore.setSelectedProgressionType(value)
})
const selectedPredefinedProgressionName = computed({
  get: () => chordStore.selectedPredefinedProgressionName,
  set: (value: string) => chordStore.setSelectedPredefinedProgressionName(value)
})

const progressionTypeOptions = [
  { label: 'Custom', value: 'custom' },
  { label: 'Predefined', value: 'predefined' }
]

const availablePredefinedProgressions = getAvailableChordProgressions()

function removeChord(index: number) {
  chordStore.removeChordFromProgression(index)
}

function clearAllChords() {
  chordStore.clearProgression()
}

// Direct Sortable.js Integration
const sortableContainer = templateRef<HTMLElement>('sortableContainer')
const dropZone = templateRef<HTMLElement>('dropZone')
let sortableInstance: Sortable | null = null

// Initialize Sortable.js on mount
onMounted(() => {
  if (sortableContainer.value) {
    sortableInstance = Sortable.create(sortableContainer.value, {
      animation: 200,
      ghostClass: 'chord-ghost',
      chosenClass: 'chord-chosen',
      dragClass: 'chord-drag',
      disabled: props.disabled,
      onEnd: (evt: any) => {
        const oldIndex = evt.oldIndex!
        const newIndex = evt.newIndex!
        if (oldIndex !== newIndex) {
          chordStore.reorderProgression(oldIndex, newIndex)
        }
      }
    })
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (sortableInstance) {
    sortableInstance.destroy()
  }
})

// Drop zone for adding new chords from palette
const { isOverDropZone } = useDropZone(dropZone, {
  // @ts-expect-error - DropZone types
  onDrop(files, event) {
    // Handle dropped chord data
    const chordDataStr = event.dataTransfer?.getData('application/chord-data')
    if (chordDataStr) {
      try {
        const chordData = JSON.parse(chordDataStr)
        if (chordData.name && chordData.notes) {
          chordStore.addChordToProgression(chordData)
          toast.add({
            severity: 'success',
            summary: 'Chord Added',
            detail: `${chordData.name} added to progression`,
            life: 2000
          })
        }
      } catch (error) {
        console.warn('Failed to parse chord data:', error)
      }
    }
  }
})

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
    <div class="flex items-center justify-between">
      <label class="font-medium text-gray-200">Chord Progression Type</label>
      <SelectButton
        v-model="selectedProgressionType"
        :options="progressionTypeOptions"
        optionLabel="label"
        optionValue="value"
        :disabled="props.disabled"
      />
    </div>

    <!-- Custom Progression Builder -->
    <div v-if="selectedProgressionType === 'custom'" :class="{ 'opacity-50 pointer-events-none': props.disabled }">
      <div class="flex items-center justify-between mb-4">
        <label class="font-medium text-gray-200">Build Your Progression</label>
        <Button
          label="Clear All"
          icon="pi pi-trash"
          severity="danger"
          size="small"
          outlined
          @click="clearAllChords"
          :disabled="currentProgression.length === 0 || props.disabled"
        />
      </div>

      <!-- Drop Zone for Chord Progression with VueUse -->
      <div
        ref="dropZone"
        class="min-h-[140px] p-6 border-2 border-dashed rounded-lg transition-all duration-300"
        :class="{
          'border-zinc-600 bg-zinc-900': !isOverDropZone,
          'border-blue-400 bg-blue-900/40': isOverDropZone,
          'border-emerald-500 bg-emerald-900/20': currentProgression.length > 0 && !isOverDropZone
        }"
      >
        <!-- Sortable Container -->
        <div v-if="currentProgression.length > 0" ref="sortableContainer" class="flex flex-wrap gap-3">
          <ChordCard
            v-for="(chord, index) in currentProgression"
            :key="`${chord.name}-${index}`"
            :chord="chord"
            :index="index"
            size="medium"
            :show-remove-button="true"
            :show-roman-numeral="true"
            class="chord-in-progression cursor-grab"
            @remove="removeChord"
          />
        </div>

        <!-- Empty State -->
        <div v-else class="flex items-center justify-center text-zinc-500 text-sm italic py-8">
          <div class="text-center">
            <i class="pi pi-arrow-down text-3xl mb-3 block text-zinc-600"></i>
            <p class="mb-1">Your chord progression will appear here</p>
            <p class="text-xs text-zinc-600">Drag chords from below to add them</p>
          </div>
        </div>
      </div>

      <!-- Chord Palette -->
      <div class="mt-6">
        <DiatonicChordPalette :disabled="props.disabled" />
      </div>
    </div>

    <!-- Predefined Progression Selector -->
    <div v-else :class="{ 'opacity-50 pointer-events-none': props.disabled }">
      <div class="flex items-center justify-between gap-4 mb-4">
        <label class="font-medium text-gray-200">Select Predefined Progression</label>
        <Select
          v-model="selectedPredefinedProgressionName"
          :options="availablePredefinedProgressions"
          placeholder="Choose a progression..."
          class="w-full md:w-1/2"
          :disabled="props.disabled"
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
          class="pointer-events-none"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Sortable.js animation classes */
.chord-ghost {
  transform: scale(0.95);
  opacity: 0.4;
}

.chord-chosen {
  transform: scale(1.05);
  z-index: 1000;
}

.chord-drag {
  transform: rotate(5deg);
  opacity: 0.8;
}

.chord-in-progression:active {
  cursor: grabbing;
}

/* Enhanced drop zone styling */
.drop-zone-hover {
  border-color: #3b82f6;
  background-color: rgba(59, 130, 246, 0.1);
}
</style>
