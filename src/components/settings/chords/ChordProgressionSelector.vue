<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useChordStore } from '@/stores/chord.store';
import { useCompositionStore } from '@/stores/composition.store';
import { getAvailableChordProgressions, generateChordProgression } from '@/services/ChordService';
import Select from 'primevue/select';

const props = defineProps<{ disabled: boolean }>();

const chordStore = useChordStore();
const compositionStore = useCompositionStore();
const availableProgressions = ref<string[]>([]);

function updateChords() {
  const chords = generateChordProgression(chordStore.progression);
  chordStore.setChords(chords);
}

function onProgressionChange(progression: string) {
  chordStore.setProgression(progression);
  updateChords();
}

onMounted(() => {
  availableProgressions.value = getAvailableChordProgressions();
  updateChords();
});

watch(() => compositionStore.key, () => {
  updateChords();
});
</script>

<template>
  <div class="flex items-center justify-between gap-4">
    <label class="font-medium">Chord Progression</label>
    <Select
      :modelValue="chordStore.progression"
      :options="availableProgressions"
      :disabled="props.disabled"
      @update:modelValue="onProgressionChange"
    />
  </div>
</template>
