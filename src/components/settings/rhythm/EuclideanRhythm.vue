<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useRhythmStore } from '@/stores/rhythm.store'
import { generateEuclideanPattern } from '@/services/RhythmService'
import EuclideanVisualizer from '@/components/settings/rhythm/EuclideanVisualizer.vue'
import Slider from 'primevue/slider'
import SelectButton from 'primevue/selectbutton'
import Button from 'primevue/button'

const props = defineProps<{
  euclideanTabSelected: boolean
}>()

const rhythmStore = useRhythmStore()

const pulses = ref(5)
const steps = ref(16)
const subdivision = ref('16n')

const subdivisionInt = computed(() => {
  return parseInt(subdivision.value.split('n')[0])
})
const stepDescription = computed(() => {
  const bars = (steps.value / subdivisionInt.value).toFixed(2).replace(/\.00$/, '')
  return `${steps.value} steps per pattern repetition (${bars} bars)`
})

watch([pulses, steps, subdivision], () => {
  rhythmStore.setEuclideanRotation(0)
  generateAndSetEuclideanRhythm()
})

watch(
  () => props.euclideanTabSelected,
  (newVal) => {
    if (newVal) {
      rhythmStore.setUseRandomRhythm(false)
      rhythmStore.setEuclideanRotation(0)
      generateAndSetEuclideanRhythm()
    }
  }
)

watch(
  () => rhythmStore.rhythm,
  (currentRhythm) => {
    if (currentRhythm?.category === 'euclidean') {
      pulses.value = currentRhythm.pulses
      steps.value = currentRhythm.pattern.pattern?.length || 16
      subdivision.value = currentRhythm.pattern.subdivision || '16n'
    }
  },
  { immediate: true, deep: true }
)

const generateAndSetEuclideanRhythm = () => {
  if (steps.value < pulses.value) {
    pulses.value = steps.value
  }
  const newRhythm = generateEuclideanPattern(
    pulses.value,
    steps.value,
    subdivision.value,
    rhythmStore.euclideanRotation
  )
  rhythmStore.setRhythm(newRhythm)
}

function rotate(amount: number) {
  // amount=1  -> left rotation
  // amount=-1 -> right rotation
  const newRotation = rhythmStore.euclideanRotation + amount
  rhythmStore.setEuclideanRotation(newRotation)
  generateAndSetEuclideanRhythm()
}

onMounted(() => {
  const currentRhythm = rhythmStore.rhythm

  if (currentRhythm?.category === 'euclidean') {
    pulses.value = currentRhythm.pulses
    steps.value = currentRhythm.pattern.pattern?.length || 16
    subdivision.value = currentRhythm.pattern.subdivision || '16n'
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
  <div class="flex flex-col md:flex-row items-center justify-center gap-2 w-full">
    <div class="pt-2 flex flex-col gap-4 w-full md:w-[50%] items-center justify-center">
      <div class="mb-2 w-full">
        <label :for="'pulses-slider'" class="text-sm pb-2 flex items-center gap-2">
          <span>Pulses</span>
          <span class="text-zinc-400">{{ pulses }}</span>
        </label>
        <Slider v-model="pulses" :min="1" :max="steps" :id="'pulses-slider'" />
      </div>
      <div class="mb-2 w-full">
        <label :for="'steps-slider'" class="text-sm pb-2 flex items-center gap-2">
          <span>Steps</span>
          <span class="text-zinc-400">{{ steps }}</span>
        </label>
        <Slider v-model="steps" :min="2" :max="32" :id="'steps-slider'" />
      </div>
      <div class="mb-2 w-full">
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
    <div class="w-full flex flex-col items-center justify-center">
      <EuclideanVisualizer />
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
      <strong>Pulses:</strong> Number of played notes in the pattern.<br />
      <strong>Steps:</strong> The length of one pattern repetition.<br />
      <strong>Subdivision:</strong> Rhythmic value of a single step. The total duration of one pattern repetition is
      {{ stepDescription }}.
    </p>
  </div>
</template>
