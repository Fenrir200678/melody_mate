<script setup lang="ts">
import InputNumber from 'primevue/inputnumber'
import { useCompositionStore } from '@/stores/composition.store'
import { useMelodyStore } from '@/stores/melody.store'

const compositionStore = useCompositionStore()
const melodyStore = useMelodyStore()

async function updateOctave(value: number) {
  compositionStore.setOctave(value)

  if (melodyStore.midiUrl) {
    await melodyStore.generateMidiFile()
  }
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
      @update:modelValue="updateOctave"
    />
  </div>
</template>
