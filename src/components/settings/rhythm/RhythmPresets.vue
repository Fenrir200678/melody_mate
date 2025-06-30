<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import { useRhythmStore } from '@/stores/rhythm.store'

import { WEIGHTED_RHYTHMS } from '@/data/weighted_rhythms'
import { RHYTHM_CATEGORIES } from '@/ts/consts'
import type { WeightedRhythm, RhythmCategory } from '@/ts/types/rhythm.types'
import { useRhythmSelection } from '@/composables/useRhythmSelection'

import Listbox from 'primevue/listbox'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'

const props = defineProps<{ rhythmTabSelected: boolean }>()
const rhythmStore = useRhythmStore()

const { setDefaultRhythm, setRhythmCategory, setUseRandomRhythm } = useRhythmSelection()

const categoryOptions = Object.entries(RHYTHM_CATEGORIES).map(([value, label]) => ({
  value: value as RhythmCategory,
  label
}))

const filteredRhythms = computed(() =>
  WEIGHTED_RHYTHMS.filter((r) => r.category === rhythmStore.rhythmCategory).sort((a, b) => a.name.localeCompare(b.name))
)

function handleCategoryChange(category: RhythmCategory) {
  setRhythmCategory(category)
}

function handleRhythmChange(rhythm: WeightedRhythm) {
  if (!rhythm) return
  rhythmStore.setCustomRhythm(false)
  rhythmStore.setRhythm(rhythm)
}

function handleUseRandomRhythmChange(use: boolean) {
  setUseRandomRhythm(use)
}

function restoreLastBars() {
  // Set default rhythm for current category
  setDefaultRhythm(rhythmStore.rhythmCategory)
}

watch(
  () => props.rhythmTabSelected,
  () => {
    rhythmStore.setCustomRhythm(false)
    rhythmStore.setUseRandomRhythm(false)
    restoreLastBars()
  }
)

onMounted(() => {
  if (props.rhythmTabSelected) {
    restoreLastBars()
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
        :severity="rhythmStore.rhythmCategory === option.value ? 'primary' : 'secondary'"
        @click="handleCategoryChange(option.value)"
      />
    </div>

    <!-- Rhythm List -->
    <Listbox
      v-model="rhythmStore.rhythm"
      class="w-full"
      :disabled="rhythmStore.useRandomRhythm"
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

  <!-- Random Rhythm -->
  <div class="flex items-center justify-between gap-4 mt-4">
    <div class="flex flex-col flex-1 min-w-0">
      <label for="use-random-rhythm" class="font-medium leading-tight">
        Use Random Rhythm<br />
        <span class="text-xs break-words">
          Use a random rhythm of the selected category instead of the selected one.
        </span>
      </label>
    </div>
    <Checkbox
      v-model="rhythmStore.useRandomRhythm"
      :binary="true"
      inputId="use-random-rhythm"
      @update:modelValue="handleUseRandomRhythmChange"
    />
  </div>
</template>
