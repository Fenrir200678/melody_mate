<script setup lang="ts">
import { ref, computed } from 'vue'
import SelectButton from 'primevue/selectbutton'
import { useCompositionStore } from '@/stores/composition.store'
import { useGenerationStore } from '@/stores/generation.store'

const compositionStore = useCompositionStore()
const generationStore = useGenerationStore()
const barsOptions = ref(['1', '2', '4', '8', '16'])

function handleBarsChange(val: string) {
  if (Number(val) <= 4) {
    generationStore.setUseMotifRepetition(false)
  }
  compositionStore.setBars(Number(val))
}

const selectedBars = computed(() => (compositionStore.bars ?? 4).toString())
</script>

<template>
  <div class="flex items-center justify-between gap-4">
    <label class="font-medium">Length (bars)</label>
    <SelectButton :model-value="selectedBars" :options="barsOptions" @update:modelValue="handleBarsChange" />
  </div>
</template>
