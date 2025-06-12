<script setup lang="ts">
import { computed } from 'vue'
import { useMusicStore } from '@/stores/music.store'
import Slider from 'primevue/slider'

const store = useMusicStore()
const value = computed({
  get: () => store.restProbability,
  set: (v: number) => store.setRestProbability(v)
})
</script>
<template>
  <div class="flex flex-col justify-around gap-4 mt-8">
    <div class="flex flex-col flex-1 min-w-0">
      <label for="rest-probability-slider" class="font-medium">Rest Probability</label>
      <span class="text-xs break-words">
        Probability that a rest (silence) will be inserted instead of a note. Higher values create sparser, more
        syncopated melodies.
      </span>
    </div>
    <div class="flex items-center gap-4 w-full mt-4">
      <Slider id="rest-probability-slider" class="w-full" v-model="value" :min="0" :max="0.75" :step="0.05" />
    </div>
    <span class="w-10 text-right text-xs tabular-nums">{{ (value * 100).toFixed(0) }}%</span>
  </div>
</template>
