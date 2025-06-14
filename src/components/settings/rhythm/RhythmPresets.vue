<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import useMusicStore from '@/stores/music.store'
import { WEIGHTED_RHYTHMS } from '@/data/weighted_rhythms'
import { RHYTHM_CATEGORIES } from '@/ts/consts'
import type { WeightedRhythm, RhythmCategory } from '@/ts/types/rhythm.types'

import Listbox from 'primevue/listbox'
import Button from 'primevue/button'

const props = defineProps<{ rhythmTabSelected: boolean }>()
const store = useMusicStore()

const categoryOptions = Object.entries(RHYTHM_CATEGORIES).map(([value, label]) => ({
  value: value as RhythmCategory,
  label
}))

const selectedCategory = ref<RhythmCategory>('melody')
const selectedRhythm = ref<WeightedRhythm | null>(null)

const filteredRhythms = computed(() =>
  WEIGHTED_RHYTHMS.filter((r) => r.category === selectedCategory.value).sort((a, b) => a.name.localeCompare(b.name))
)

function setDefaultRhythm() {
  const firstRhythm = filteredRhythms.value[0] || null
  selectedRhythm.value = firstRhythm
  if (firstRhythm) {
    store.setRhythm(firstRhythm)
  }
}

function handleRhythmChange(rhythm: WeightedRhythm) {
  if (!rhythm) return
  store.setRhythm(rhythm)
}

// Update selection when category changes
watch(selectedCategory, () => {
  setDefaultRhythm()
})

// If the tab becomes active, ensure a rhythm is selected
watch(
  () => props.rhythmTabSelected,
  (rhythmTabSelected, prevRhythmTabSelected) => {
    if (rhythmTabSelected && !prevRhythmTabSelected && !store.rhythm) {
      setDefaultRhythm()
      store.setBars(store.lastBars)
    }
  }
)

onMounted(() => {
  // Set default rhythm only if the tab is already active on mount
  if (props.rhythmTabSelected) {
    setDefaultRhythm()
  }
})
</script>

<template>
  <div class="pt-2 flex gap-4">
    <!-- Category Selector -->
    <div class="flex flex-col items-start gap-2 w-[100px]">
      <Button
        v-for="option in categoryOptions"
        :key="option.value"
        :label="option.label"
        fluid
        size="small"
        :severity="selectedCategory === option.value ? 'primary' : 'secondary'"
        @click="selectedCategory = option.value"
      />
    </div>

    <!-- Rhythm List -->
    <Listbox
      v-model="selectedRhythm"
      class="w-full"
      striped
      :options="filteredRhythms"
      option-label="name"
      placeholder="Select a rhythm"
      scroll-height="300px"
      @change="handleRhythmChange($event.value)"
    >
      <template #option="{ option }">
        <div class="flex flex-col">
          <span class="font-medium text-sm">{{ option.name }}</span>
          <span v-if="option.description" class="text-xs text-zinc-300 mt-1">
            {{ option.description }}
          </span>
        </div>
      </template>
    </Listbox>
  </div>
</template>
