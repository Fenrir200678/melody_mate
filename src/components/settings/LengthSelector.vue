<script setup lang="ts">
import { ref, computed } from 'vue'
import SelectButton from 'primevue/selectbutton'
import useMusicStore from '@/stores/music.store'

const store = useMusicStore()
const barsOptions = ref(['1', '2', '4', '8', '16'])

function handleBarsChange(val: string) {
  if (Number(val) <= 4) {
    store.setUseMotifRepetition(false)
  }
  store.setBars(Number(val))
}

const selectedBars = computed(() => store.bars.toString())
</script>

<template>
  <div class="flex items-center justify-between gap-4">
    <label class="font-medium">Length (bars)</label>
    <SelectButton
      :model-value="selectedBars"
      :options="barsOptions"
      :disabled="store.isEuclideanRhythm"
      @update:modelValue="handleBarsChange"
    />
  </div>
</template>
