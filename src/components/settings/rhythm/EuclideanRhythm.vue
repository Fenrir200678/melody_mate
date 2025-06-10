<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import useMusicStore from '@/stores/music.store'
import { generateEuclideanPattern } from '@/services/RhythmService'
import EuclideanVisualizer from '@/components/settings/rhythm/EuclideanVisualizer.vue'
import Slider from 'primevue/slider'
import SelectButton from 'primevue/selectbutton'
import Button from 'primevue/button'

const props = defineProps<{
  euclideanTabSelected: boolean
}>()

const store = useMusicStore()

const pulses = ref(5)
const steps = ref(16)
const subdivision = ref('16n')

const subdivisionInt = computed(() => {
  return parseInt(subdivision.value.split('n')[0])
})
const stepDescription = computed(() => {
  return `${steps.value} × ${subdivision.value} = ${Math.round((steps.value / subdivisionInt.value) * 100) / 100} bar(s)`
})

watch([pulses, steps, subdivision], () => {
  store.setEuclideanRotation(0)
  generateAndSetEuclideanRhythm()
})

watch(
  () => props.euclideanTabSelected,
  (newVal) => {
    if (newVal) {
      generateAndSetEuclideanRhythm()
    }
  }
)

const generateAndSetEuclideanRhythm = () => {
  if (steps.value < pulses.value) {
    pulses.value = steps.value
  }
  const newRhythm = generateEuclideanPattern(pulses.value, steps.value, subdivision.value, store.euclideanRotation)
  store.setRhythm(newRhythm)
  // Automatically set bars based on steps for Euclidean rhythms
  const newBars = Math.ceil(steps.value / subdivisionInt.value)
  store.setBars(newBars)
}

function rotate(amount: number) {
  // amount=1  -> left rotation
  // amount=-1 -> right rotation
  const newRotation = store.euclideanRotation + amount
  store.setEuclideanRotation(newRotation)
  generateAndSetEuclideanRhythm()
}

onMounted(() => {
  const currentRhythm = store.rhythm

  if (currentRhythm && store.isEuclideanRhythm && currentRhythm.pattern) {
    pulses.value = currentRhythm.pulses || 0
    steps.value = currentRhythm.pattern.length
    // Also set the correct bar count on mount
    const subdivisionToStepsPerBar: Record<string, number> = {
      '32n': 32,
      '16n': 16,
      '8n': 8,
      '4n': 4
    }
    const stepsPerBar = subdivisionToStepsPerBar[currentRhythm.subdivision || '16n'] || 16
    const newBars = Math.ceil(steps.value / stepsPerBar)
    store.setBars(newBars)
  }
})

const subdivisionOptions = computed(() => {
  return ['4n', '8n', '16n', '32n'].map((subdivision) => ({
    value: subdivision,
    label: subdivision
  }))
})
</script>

<template>
  <div class="flex items-startjustify-between gap-2 w-full">
    <div class="pt-2 flex flex-col gap-4 w-[50%]">
      <div class="mb-2">
        <label :for="'pulses-slider'" class="text-sm pb-2 flex items-center gap-2">
          <span>Pulses</span>
          <span class="text-zinc-400">{{ pulses }}</span>
        </label>
        <Slider v-model="pulses" :min="1" :max="steps" :id="'pulses-slider'" />
      </div>
      <div class="mb-2">
        <label :for="'steps-slider'" class="text-sm pb-2 flex items-center gap-2">
          <span>Steps</span>
          <span class="text-zinc-400">{{ steps }}</span>
        </label>
        <Slider v-model="steps" :min="2" :max="32" :id="'steps-slider'" />
      </div>
      <div class="mb-2">
        <label :for="'subdivision-select'" class="text-sm pb-2 flex items-center gap-2">
          <span>Subdivision</span>
          <span class="text-zinc-400">{{ subdivision }}</span>
        </label>
        <SelectButton
          v-model="subdivision"
          :options="subdivisionOptions"
          :id="'subdivision-select'"
          option-label="label"
          option-value="value"
        />
      </div>
    </div>
    <div class="w-[50%] flex flex-col items-center justify-center">
      <EuclideanVisualizer :isAnimated="store.isPlaying" />
      <div class="flex items-center justify-center gap-2 w-full">
        <Button icon="pi pi-arrow-left" rounded text severity="secondary" aria-label="Rotate Left" @click="rotate(1)" />
        <Button
          icon="pi pi-arrow-right"
          rounded
          text
          severity="secondary"
          aria-label="Rotate Right"
          @click="rotate(-1)"
        />
      </div>
    </div>
  </div>
  <!-- Explanation Text -->
  <div class="text-xs text-zinc-500 leading-relaxed">
    <p>
      Your rhythm will spread <strong>{{ pulses }} notes </strong> evenly over <strong>{{ steps }} steps</strong>.
    </p>
    <p class="mt-1">
      <strong>Pulses:</strong> Number of played notes in time raster<br />
      <strong>Steps:</strong> Time raster ({{ stepDescription }})<br />
      <strong>Subdivision:</strong> Rhythmic subdivision - Total duration of the rhythmic cycle (e.g. 16th notes with 16
      steps = 1 bar)
    </p>
  </div>
  <div class="text-xs text-zinc-500 leading-relaxed mt-2">
    <p class="mt-1">
      <strong>Note:</strong> With few pulses (e.g. 6 of 16), the last note may not reach the end of the bar. This is a
      typical and mathematically correct property of Euclidean rhythms. Larger gaps at the end can occur when pulses are
      distributed unevenly, which means that the exported MIDI file won't end exactly on the end of the bar.
    </p>
    <p class="mt-1">
      Also <span class="font-bold">Motif Repetition</span> can't be used with Euclidean rhythms and
      <span class="font-bold">Length (bars)</span> below has no effect on the length of the generated melody and is
      disabled.
    </p>
  </div>
</template>
