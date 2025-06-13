<script setup lang="ts">
import InputNumber from 'primevue/inputnumber'
import useMusicStore from '@/stores/music.store'

const store = useMusicStore()

async function updateOctave(value: number) {
  store.setOctave(value)

  if (store.midiUrl) {
    await store.generateMidiFile()
  }
}
</script>

<template>
  <div class="flex items-center gap-4">
    <label class="font-medium">Octave</label>
    <InputNumber
      :model-value="store.octave"
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
