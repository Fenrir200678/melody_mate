<script setup lang="ts">
import { computed } from 'vue'
import { useGenerationStore } from '@/stores/generation.store'
import Slider from 'primevue/slider'

const props = defineProps<{ disabled: boolean }>()

const generationStore = useGenerationStore()
const value = computed({
  get: () => generationStore.chordAdherence,
  set: (v: number) => generationStore.setChordAdherence(v)
})
</script>

<template>
  <div class="flex flex-col justify-around gap-4 mt-2">
    <div class="flex flex-col flex-1 min-w-0">
      <label for="chord-adherence-slider" class="font-medium">Chord Adherence</label>
      <span class="text-xs break-words">
        Controls how strictly the melody follows the notes of the current chord.
      </span>
    </div>
    <div class="flex items-center gap-4 w-full mt-2">
      <Slider
        id="chord-adherence-slider"
        class="w-full"
        v-model="value"
        :min="0"
        :max="1"
        :step="0.05"
        :disabled="props.disabled"
      />
      <span class="w-10 text-right text-xs tabular-nums">{{ ((value ?? 0) * 100).toFixed(0) }}%</span>
    </div>
  </div>
</template>
