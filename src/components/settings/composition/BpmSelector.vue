<script setup lang="ts">
import { ref } from 'vue'
import InputNumber from 'primevue/inputnumber'
import useMusicStore from '@/stores/music.store'

const store = useMusicStore()
const bpm = ref<number>(store.bpm)
</script>

<template>
  <div class="flex items-center justify-between gap-4">
    <label class="font-medium">BPM</label>
    <InputNumber
      :model-value="bpm"
      :min="40"
      :max="240"
      fluid
      showButtons
      buttonLayout="stacked"
      @update:modelValue="store.setBpm"
    />
  </div>
</template>
