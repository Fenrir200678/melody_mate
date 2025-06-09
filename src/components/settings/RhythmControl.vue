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

// Common store instance
const store = useMusicStore()

// --- Euclidean Generator Logic ---
const pulses = ref(5)
const steps = ref(16)
const activeTab = ref(0)

const stepDescription = computed(() => {
  return `${steps.value} × 16th = ${Math.round((steps.value / 16) * 100) / 100} bar(s)`
})

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
const availableRhythms = ref<CategorizedRhythm[]>(PREDEFINED_RHYTHMS)
const selectedRhythm = ref<CategorizedRhythm | null>(null)
const selectedCategory = ref<RhythmCategory>('bass')

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

// Watch category change to auto-select first rhythm
watch(selectedCategory, () => {
  const firstRhythm = filteredRhythms.value[0]
  if (firstRhythm) {
    onRhythmChange(firstRhythm)
  }
})
</script>

<template>
  <Tabs v-model:value="activeTab">
    <TabList>
      <Tab :value="0">Euclidean Rhythm</Tab>
      <Tab :value="1">Rhythm Presets</Tab>
    </TabList>

    <TabPanels>
      <TabPanel :value="0">
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

            <!-- Explanation Text -->
            <div class="text-xs text-zinc-500 leading-relaxed">
              <p>
                Your rhythm will spread <strong>{{ pulses }} notes </strong> evenly over
                <strong>{{ steps }} steps</strong>.
              </p>
              <p class="mt-1">
                <span class="text-zinc-400">Pulses:</span> Number of played notes<br />
                <span class="text-zinc-400">Steps:</span> Time raster ({{ stepDescription }})
              </p>
              <p class="mt-1">
                With euclidean rhythms, the "Length (bars)" selection will just repeat the generated rhythm x times.
              </p>
            </div>
          </div>
          <div class="w-[50%]">
            <EuclideanVisualizer :pulses="pulses" :steps="steps" />
          </div>
        </div>
      </TabPanel>
      <TabPanel :value="1">
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
    </TabPanels>
  </Tabs>
</template>
