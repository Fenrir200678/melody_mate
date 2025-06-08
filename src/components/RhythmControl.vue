<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import useMusicStore from '@/stores/music.store'
import { generateEuclideanPattern } from '@/services/RhythmService'
import { PREDEFINED_RHYTHMS } from '@/data/rhythms'
import type { RhythmPattern } from '@/models'
import Slider from 'primevue/slider'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'

// Common store instance
const store = useMusicStore()

// --- Euclidean Generator Logic ---
const pulses = ref(5)
const steps = ref(16)
const activeTab = ref(0)

const generateAndSetEuclideanRhythm = () => {
  if (steps.value < pulses.value) {
    pulses.value = steps.value
  }
  const newRhythm = generateEuclideanPattern(pulses.value, steps.value, '16n')
  store.setRhythm(newRhythm)
}

watch([pulses, steps], () => {
  if (activeTab.value === 0) {
    generateAndSetEuclideanRhythm()
  }
})

// --- Preset Selector Logic ---
type PredefinedRhythm = {
  name: string
  pattern: RhythmPattern
}

const availableRhythms = ref<PredefinedRhythm[]>(PREDEFINED_RHYTHMS)
const selectedRhythm = ref<PredefinedRhythm | null>(null)

function onRhythmChange(value: PredefinedRhythm) {
  if (value) {
    selectedRhythm.value = value
    store.setRhythm(value.pattern)
  }
}

// Set a default rhythm on initial component mount
onMounted(() => {
  generateAndSetEuclideanRhythm()
  // Set initial preset for display
  if (availableRhythms.value.length > 0) {
    selectedRhythm.value = availableRhythms.value[0]
  }
})

watch(activeTab, (newIndex) => {
  if (newIndex === 1) {
    // When switching to presets, apply the currently selected one
    if (selectedRhythm.value) {
      store.setRhythm(selectedRhythm.value.pattern)
    }
  } else if (newIndex === 0) {
    // When switching back to generator, re-apply the euclidean rhythm
    generateAndSetEuclideanRhythm()
  }
})
</script>

<template>
  <div class="p-0 border border-surface-200 dark:border-surface-700">
    <Tabs v-model:value="activeTab" class="w-full">
      <TabList>
        <Tab :value="0">Euclidean Generator</Tab>
        <Tab :value="1">Presets</Tab>
      </TabList>
      <TabPanels>
        <TabPanel :value="0">
          <div class="p-4 flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label :for="'pulses-slider'">Pulses: {{ pulses }}</label>
              <Slider v-model="pulses" :min="1" :max="steps" :id="'pulses-slider'" />
            </div>
            <div class="flex flex-col gap-2">
              <label :for="'steps-slider'">Steps: {{ steps }}</label>
              <Slider v-model="steps" :min="2" :max="32" :id="'steps-slider'" />
            </div>
          </div>
        </TabPanel>
        <TabPanel :value="1">
          <div class="p-4 flex justify-center">
            <ul class="w-full max-w-xs flex flex-col gap-1">
              <li
                v-for="rhythm in availableRhythms"
                :key="rhythm.name"
                @click="onRhythmChange(rhythm)"
                :class="[
                  'cursor-pointer rounded transition-colors flex items-center justify-between text-sm',
                  selectedRhythm?.name === rhythm.name
                    ? 'bg-primary-100 dark:bg-primary-700 text-primary-900 dark:text-primary-50 font-bold'
                    : 'bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600'
                ]"
              >
                <span>{{ rhythm.name }}</span>
                <span v-if="selectedRhythm?.name === rhythm.name" aria-label="Ausgewählt">✔️</span>
              </li>
            </ul>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
