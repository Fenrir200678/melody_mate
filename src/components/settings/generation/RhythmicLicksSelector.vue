<script setup lang="ts">
import { computed } from 'vue';
import { useGenerationStore } from '@/stores/generation.store';
import Checkbox from 'primevue/checkbox';
import Slider from 'primevue/slider';

const generationStore = useGenerationStore();

const useLicks = computed({
  get: () => generationStore.useRhythmicLicks,
  set: (value) => generationStore.setUseRhythmicLicks(value),
});

const frequency = computed({
  get: () => generationStore.rhythmicLickFrequency,
  set: (value) => generationStore.setRhythmicLickFrequency(value),
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-4">
      <div class="flex flex-col flex-1 min-w-0">
        <label for="use-licks-checkbox" class="font-medium">Use Rhythmic Licks</label>
        <span class="text-xs break-words">
          Inject short, predefined rhythmic phrases to add variety.
        </span>
      </div>
      <Checkbox v-model="useLicks" :binary="true" inputId="use-licks-checkbox" />
    </div>

    <div v-if="useLicks" class="flex flex-col justify-around gap-2 mt-2">
      <div class="flex flex-col flex-1 min-w-0">
        <label for="lick-frequency-slider" class="font-medium">Lick Frequency</label>
        <span class="text-xs break-words">
          How often the licks should appear in the melody.
        </span>
      </div>
      <div class="flex items-center gap-4 w-full mt-2">
        <Slider
          id="lick-frequency-slider"
          class="w-full"
          v-model="frequency"
          :min="0"
          :max="1"
          :step="0.05"
        />
        <span class="w-10 text-right text-xs tabular-nums">{{ (frequency * 100).toFixed(0) }}%</span>
      </div>
    </div>
  </div>
</template>
