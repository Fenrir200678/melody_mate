<script setup lang="ts">
import { ref } from 'vue'
import InputNumber from 'primevue/inputnumber'
import { usePlayerStore } from '@/stores/player.store'

const playerStore = usePlayerStore()
const bpm = ref<number>(playerStore.bpm ?? 120)

async function updateBpm(value: string) {
  playerStore.setBpm(parseInt(value))
}
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
      @blur="updateBpm($event.value)"
      @keydown.enter="updateBpm($event.target.value)"
    />
  </div>
</template>
