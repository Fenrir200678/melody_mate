<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import useMusicStore from '@/stores/music.store'

import { PREDEFINED_RHYTHMS } from '@/data/rhythms'
import { RHYTHM_CATEGORIES } from '@/ts/consts'
import type { CategorizedRhythm, RhythmCategory } from '@/ts/types/rhythm.types'
import type { RhythmPattern } from '@/ts/models'

import SelectButton from 'primevue/selectbutton'

const store = useMusicStore()

const availableRhythms = ref<CategorizedRhythm[]>(PREDEFINED_RHYTHMS)
const selectedRhythm = ref<CategorizedRhythm | RhythmPattern | null>(null)
const selectedCategory = ref<RhythmCategory>('melody')

const rhythmsByCategory = computed(() => {
  const grouped: Record<RhythmCategory, CategorizedRhythm[]> = {
    bass: [],
    melody: [],
    world: []
  }
  availableRhythms.value.forEach((rhythm: CategorizedRhythm) => {
    grouped[rhythm.category].push(rhythm)
  })
  return grouped
})

const categoryOptions = computed(() => {
  return Object.entries(RHYTHM_CATEGORIES).map(([key, label]) => ({
    value: key as RhythmCategory,
    label
  }))
})

const filteredRhythms = computed(() => {
  const rhythms = rhythmsByCategory.value[selectedCategory.value] || []
  return rhythms.sort((a, b) => a.name.localeCompare(b.name))
})

function onRhythmChange(value: CategorizedRhythm) {
  if (value) {
    selectedRhythm.value = value
    store.setRhythm(value.pattern)
  }
}

onMounted(() => {
  const currentRhythm = store.rhythm
  if (currentRhythm && currentRhythm.pulses === undefined) {
    const preset = PREDEFINED_RHYTHMS.find((p) => p.name === currentRhythm.name)
    if (preset) {
      selectedRhythm.value = preset
      selectedCategory.value = preset.category
    }
  } else {
    onRhythmChange(PREDEFINED_RHYTHMS[5])
  }
})

watch(selectedCategory, (newCategory, oldCategory) => {
  if (newCategory !== oldCategory) {
    const firstRhythm = filteredRhythms.value[0]
    if (firstRhythm) {
      onRhythmChange(firstRhythm)
    }
  }
})
</script>

<template>
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
    <div class="flex flex-col overflow-y-auto h-[400px]">
      <div
        v-for="rhythm in filteredRhythms"
        :key="rhythm.name"
        @click="onRhythmChange(rhythm)"
        :class="[
          'cursor-pointer rounded transition-colors py-2 px-4',
          selectedRhythm?.name === rhythm.name ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-900 hover:bg-zinc-800'
        ]"
      >
        <div class="flex flex-col">
          <span class="font-medium text-sm">{{ rhythm.name }}</span>
          <span v-if="rhythm.description" class="text-xs text-zinc-400 mt-1">
            {{ rhythm.description }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
