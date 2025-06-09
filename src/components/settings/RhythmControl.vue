<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import useMusicStore from '@/stores/music.store'
import { generateEuclideanPattern } from '@/services/RhythmService'
import { PREDEFINED_RHYTHMS, RHYTHM_CATEGORIES, type CategorizedRhythm, type RhythmCategory } from '@/data/rhythms'

import EuclideanVisualizer from '@/components/EuclideanVisualizer.vue'

import Slider from 'primevue/slider'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import SelectButton from 'primevue/selectbutton'
import type { RhythmPattern } from '@/ts/models'
import Button from 'primevue/button'

// Common store instance
const store = useMusicStore()

// --- Euclidean Generator Logic ---
const pulses = ref(5)
const steps = ref(16)
const activeTab = ref(0)
const subdivision = ref('16n')
const subdivisionInt = computed(() => {
  return parseInt(subdivision.value.split('n')[0])
})

const stepDescription = computed(() => {
  return `${steps.value} × ${subdivision.value} = ${Math.round((steps.value / subdivisionInt.value) * 100) / 100} bar(s)`
})

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

// Update the store only when user interacts with sliders
watch([pulses, steps, subdivision], () => {
  if (activeTab.value === 1) {
    store.setEuclideanRotation(0)
    generateAndSetEuclideanRhythm()
  }
})

// --- Preset Selector Logic ---
const availableRhythms = ref<CategorizedRhythm[]>(PREDEFINED_RHYTHMS)
const selectedRhythm = ref<CategorizedRhythm | RhythmPattern | null>(null) // Can be either
const selectedCategory = ref<RhythmCategory>('melody')

// Group rhythms by category
const rhythmsByCategory = computed(() => {
  const grouped: Record<RhythmCategory, CategorizedRhythm[]> = {
    bass: [],
    melody: [],
    world: []
  }

  availableRhythms.value.forEach((rhythm) => {
    grouped[rhythm.category].push(rhythm)
  })

  return grouped
})

// Get category options for select
const categoryOptions = computed(() => {
  return Object.entries(RHYTHM_CATEGORIES).map(([key, label]) => ({
    value: key as RhythmCategory,
    label
  }))
})

// Get filtered rhythms for current category
const filteredRhythms = computed(() => {
  return rhythmsByCategory.value[selectedCategory.value] || []
})

function onRhythmChange(value: CategorizedRhythm) {
  if (value) {
    selectedRhythm.value = value
    store.setRhythm(value.pattern)
  }
}

function rotate(amount: number) {
  // amount=1  -> left rotation
  // amount=-1 -> right rotation
  const newRotation = store.euclideanRotation + amount
  store.setEuclideanRotation(newRotation)
  generateAndSetEuclideanRhythm()
}

// Set component state from store on mount
onMounted(() => {
  const currentRhythm = store.rhythm
  if (currentRhythm) {
    // Check if it's a Euclidean rhythm
    if (currentRhythm.pulses !== undefined && currentRhythm.pattern) {
      pulses.value = currentRhythm.pulses
      steps.value = currentRhythm.pattern.length
      selectedRhythm.value = currentRhythm
      activeTab.value = 1
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
    } else {
      // It's a preset. Find it in our list.
      const preset = PREDEFINED_RHYTHMS.find((p) => p.name === currentRhythm.name)
      if (preset) {
        selectedRhythm.value = preset
        selectedCategory.value = preset.category
      }
      activeTab.value = 0
    }
  } else {
    // If no rhythm is in store, set a default one
    onRhythmChange(PREDEFINED_RHYTHMS[0])
  }
})

watch(activeTab, (newIndex) => {
  // If the active tab is the Euclidean rhythm tab, generate and set the Euclidean rhythm
  if (newIndex === 1) {
    store.setUseNGrams(true)
    store.setUseMotifRepetition(false)
    generateAndSetEuclideanRhythm()
  } else if (newIndex === 0) {
    // If the rhythm in the store is Euclidean, switch back to a default preset (first rhythm in the category)
    if (store.isEuclideanRhythm) {
      const firstRhythm = filteredRhythms.value[0]
      if (firstRhythm) {
        onRhythmChange(firstRhythm)
      }
    }
  }
})

// Watch category change to auto-select first rhythm
watch(selectedCategory, (newCategory, oldCategory) => {
  if (newCategory !== oldCategory) {
    const firstRhythm = filteredRhythms.value[0]
    if (firstRhythm) {
      onRhythmChange(firstRhythm)
    }
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
  <Tabs v-model:value="activeTab">
    <TabList>
      <Tab :value="0">Rhythm Presets</Tab>
      <Tab :value="1">Euclidean Rhythm <span class="text-xs text-zinc-600 pl-1">beta</span></Tab>
    </TabList>

    <TabPanels>
      <TabPanel :value="0">
        <div class="pt-2 flex flex-col gap-4">
          <!-- Category Selector -->
          <div class="mb-2 flex flex-col gap-1">
            <label class="text-sm block">Rhythm Category</label>
            <div class="flex items-center justify-center w-full">
              <SelectButton
                v-model="selectedCategory"
                :options="categoryOptions"
                size="small"
                option-label="label"
                option-value="value"
                placeholder="Select a category"
              />
            </div>
          </div>

          <!-- Rhythm List -->
          <div class="flex flex-col gap-1">
            <div
              v-for="rhythm in filteredRhythms"
              :key="rhythm.name"
              @click="onRhythmChange(rhythm)"
              :class="[
                'cursor-pointer rounded transition-colors p-3 border border-zinc-600',
                selectedRhythm?.name === rhythm.name ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-900 hover:bg-zinc-800'
              ]"
            >
              <div class="flex flex-col">
                <span class="font-medium text-sm">{{ rhythm.name }}</span>
                <span v-if="rhythm.description" class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {{ rhythm.description }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </TabPanel>

      <TabPanel :value="1">
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
            <EuclideanVisualizer :isAnimated="activeTab === 1 && store.isPlaying" />
            <div class="flex items-center justify-center gap-2 w-full">
              <!-- TODO: make instant changes to generated melody when rotating -->
              <Button
                icon="pi pi-arrow-left"
                rounded
                text
                severity="secondary"
                aria-label="Rotate Left"
                @click="rotate(1)"
              />
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
            <strong>Subdivision:</strong> Rhythmic subdivision - Total duration of the rhythmic cycle (e.g. 16th notes
            with 16 steps = 1 bar)
          </p>
        </div>
        <div class="text-xs text-zinc-500 leading-relaxed mt-2">
          <p class="mt-1">
            <strong>Note:</strong> With few pulses (e.g. 6 of 16), the last note may not reach the end of the bar. This
            is a typical and mathematically correct property of Euclidean rhythms. Larger gaps at the end can occur when
            pulses are distributed unevenly, which means that the exported MIDI file won't end exactly on the end of the
            bar.
          </p>
          <p class="mt-1">
            Also <span class="font-bold">Motif Repetition</span> can't be used with Euclidean rhythms and
            <span class="font-bold">Length (bars)</span> below has no effect on the length of the generated melody and
            is disabled.
          </p>
        </div>
      </TabPanel>
    </TabPanels>
  </Tabs>
</template>
