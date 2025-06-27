<script setup lang="ts">
import { computed, watch } from 'vue';
import { useChordStore } from '@/stores/chord.store';
import { useCompositionStore } from '@/stores/composition.store';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import Select from 'primevue/select';
import DiatonicChordPalette from './DiatonicChordPalette.vue';
import { getAvailableChordProgressions } from '@/services/ChordService';
import { useToast } from 'primevue/usetoast';

const props = defineProps<{ disabled: boolean }>();

const chordStore = useChordStore();
const compositionStore = useCompositionStore();
const toast = useToast();

const currentProgression = computed(() => chordStore.currentProgression);
const selectedProgressionType = computed({
  get: () => chordStore.selectedProgressionType,
  set: (value: 'custom' | 'predefined') => chordStore.setSelectedProgressionType(value),
});
const selectedPredefinedProgressionName = computed({
  get: () => chordStore.selectedPredefinedProgressionName,
  set: (value: string) => chordStore.setSelectedPredefinedProgressionName(value),
});

const progressionTypeOptions = [
  { label: 'Custom', value: 'custom' },
  { label: 'Predefined', value: 'predefined' },
];

const availablePredefinedProgressions = getAvailableChordProgressions();

function removeChord(index: number) {
  chordStore.removeChordFromProgression(index);
}

function clearAllChords() {
  chordStore.clearProgression();
}

// Drag and Drop functionality
const dragStart = (event: DragEvent, index: number) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', index.toString());
    event.dataTransfer.effectAllowed = 'move';
  }
};

const dragOver = (event: DragEvent) => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
};

const drop = (event: DragEvent, newIndex: number) => {
  event.preventDefault();
  const oldIndex = parseInt(event.dataTransfer?.getData('text/plain') || '-1', 10);
  if (oldIndex !== -1 && oldIndex !== newIndex) {
    chordStore.reorderProgression(oldIndex, newIndex);
  }
};

const dragEnter = (event: DragEvent) => {
  event.preventDefault();
};

watch(
  () => [compositionStore.key, compositionStore.scaleName],
  ([newKey, newScaleName], [oldKey, oldScaleName]) => {
    if (chordStore.selectedProgressionType === 'custom' && (newKey !== oldKey || newScaleName !== oldScaleName)) {
      if (chordStore.currentProgression.length > 0) {
        chordStore.clearProgression();
        toast.add({
          severity: 'info',
          summary: 'Progression Reset',
          detail: 'Custom chord progression cleared due to key or scale change.',
          life: 3000,
        });
      }
    }
  }
);

</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <label class="font-medium">Chord Progression Type</label>
      <SelectButton
        v-model="selectedProgressionType"
        :options="progressionTypeOptions"
        optionLabel="label"
        optionValue="value"
        :disabled="props.disabled"
      />
    </div>

    <div v-if="selectedProgressionType === 'custom'" :class="{ 'opacity-50 pointer-events-none': props.disabled }">
      <div class="flex items-center justify-between mb-4">
        <label class="font-medium">Build Your Progression</label>
        <Button
          label="Clear All"
          icon="pi pi-times"
          severity="danger"
          size="small"
          outlined
          @click="clearAllChords"
          :disabled="currentProgression.length === 0 || props.disabled"
        />
      </div>

      <div
        class="flex flex-wrap gap-2 p-4 border border-zinc-700 rounded-lg bg-zinc-800 min-h-[60px]"
        @dragover="dragOver"
        @drop="(e) => drop(e, currentProgression.length)"
        @dragenter="dragEnter"
      >
        <div
          v-for="(chord, index) in currentProgression"
          :key="index"
          class="p-2 bg-emerald-700 rounded-md flex items-center gap-2 cursor-grab"
          draggable="true"
          @dragstart="(e) => dragStart(e, index)"
          @dragover="dragOver"
          @drop="(e) => drop(e, index)"
          @dragenter="dragEnter"
        >
          <span class="text-sm font-semibold">{{ chord.name }}</span>
          <Button
            icon="pi pi-times"
            severity="secondary"
            text
            rounded
            size="small"
            @click="removeChord(index)"
            :disabled="props.disabled"
          />
        </div>
        <span v-if="currentProgression.length === 0" class="text-zinc-500 text-sm italic"
          >Drag chords here or click them below to add.</span
        >
      </div>

      <DiatonicChordPalette :disabled="props.disabled" />
    </div>

    <div v-else :class="{ 'opacity-50 pointer-events-none': props.disabled }">
      <div class="flex items-center justify-between gap-4">
        <label class="font-medium">Select Predefined Progression</label>
        <Select
          v-model="selectedPredefinedProgressionName"
          :options="availablePredefinedProgressions"
          placeholder="Select a Progression"
          class="w-full md:w-1/2"
          :disabled="props.disabled"
        />
      </div>
    </div>
  </div>
</template>
