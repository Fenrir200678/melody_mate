<script setup lang="ts">
import { ref } from 'vue'
import InputNumber from 'primevue/inputnumber'
import useMusicStore from '@/stores/music.store'

const store = useMusicStore()
const octave = ref<number>(store.octave)
</script>

<template>
  <label class="font-medium">Octave</label>
  <InputNumber
    :model-value="octave"
    :min="1"
    :max="8"
    :step="1"
    fluid
    showButtons
    buttonLayout="stacked"
    @update:modelValue="store.setOctave"
  />
</template>
