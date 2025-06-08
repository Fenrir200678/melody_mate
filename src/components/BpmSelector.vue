<script setup lang="ts">
import { ref, watch } from 'vue'
import InputNumber from 'primevue/inputnumber'
import useMusicStore from '@/stores/music.store'

const store = useMusicStore()
const bpm = ref<number>(store.bpm)

watch(bpm, (newVal) => {
  if (newVal > 0) {
    store.setBpm(newVal)
  }
})
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <InputNumber v-model="bpm" :min="40" :max="240" fluid showButtons buttonLayout="stacked" />
  </div>
</template>
