<script setup lang="ts">
import InputNumber from 'primevue/inputnumber'
import { useCompositionStore } from '@/stores/composition.store'

const compositionStore = useCompositionStore()

async function updateOctave(value: string) {
  compositionStore.setOctave(parseInt(value))
}
</script>

<template>
  <div class="flex items-center gap-4">
    <label class="font-medium">Octave</label>
    <InputNumber
      :model-value="compositionStore.octave"
      :min="1"
      :max="8"
      :step="1"
      fluid
      showButtons
      buttonLayout="stacked"
      @blur="updateOctave($event.value)"
      @keydown.enter="updateOctave($event.target.value)"
    />
  </div>
</template>
