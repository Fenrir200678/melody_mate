<script setup lang="ts">
import { computed } from 'vue'
import InputNumber from 'primevue/inputnumber'
import { useCompositionStore } from '@/stores/composition.store'

const compositionStore = useCompositionStore()

const currentMinOctave = computed(() => compositionStore.minOctave)
const currentMaxOctave = computed(() => compositionStore.maxOctave)

async function updateMinOctave(value: string) {
  compositionStore.setMinOctave(parseInt(value))
}

async function updateMaxOctave(value: string) {
  compositionStore.setMaxOctave(parseInt(value))
}
</script>

<template>
  <div class="flex items-center gap-4">
    <label class="font-medium">Octave Range</label>
    <div class="flex items-center gap-2">
      <InputNumber
        :model-value="currentMinOctave"
        :min="0"
        :max="currentMaxOctave"
        :step="1"
        fluid
        showButtons
        buttonLayout="stacked"
        @blur="updateMinOctave($event.value)"
        @keydown.enter="updateMinOctave($event.target.value)"
      />
      <span>-</span>
      <InputNumber
        :model-value="currentMaxOctave"
        :min="currentMinOctave"
        :max="8"
        :step="1"
        fluid
        showButtons
        buttonLayout="stacked"
        @blur="updateMaxOctave($event.value)"
        @keydown.enter="updateMaxOctave($event.target.value)"
      />
    </div>
  </div>
</template>
