<script setup lang="ts">
import { computed } from 'vue'
import { useGenerationStore } from '@/stores/generation.store'
import Slider from 'primevue/slider'
import InfoBox from '@/components/common/InfoBox.vue'

const generationStore = useGenerationStore()
const value = computed({
  get: () => generationStore.restProbability,
  set: (v: number) => generationStore.setRestProbability(v)
})
</script>

<template>
  <div class="flex flex-col justify-around gap-4 mt-8">
    <div class="flex flex-col flex-1 min-w-0">
      <label for="rest-probability-slider" class="font-medium">Rest Probability</label>
      <span class="text-sm break-words leading-relaxed">
        Probability that a rest will be inserted instead of a note.
      </span>
    </div>
    <div class="flex items-center gap-4 w-full">
      <Slider id="rest-probability-slider" class="w-full" v-model="value" :min="0" :max="0.75" :step="0.05" />
      <span class="w-10 text-right text-xs tabular-nums">{{ ((value ?? 0) * 100).toFixed(0) }}%</span>
    </div>

    <InfoBox>
      <p class="mb-2">
        Higher values create sparser, more syncopated melodies. Only works with rhythm presets, since euclidean and
        custom sequencer rhythms generate their own rests.
      </p>
      <p>
        It should also be noted that when you're using motif repetition, the rests apply per motif section and not to
        the entire melody. E.g.: If you use the pattern AAAB, the rests will be applied randomly to the A section and
        randomly to the B section, so you get 3 times the same rest pattern A and 1 time the rest pattern B.
      </p>
    </InfoBox>
  </div>
</template>
