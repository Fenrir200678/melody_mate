<script setup lang="ts">
import { ref, computed } from 'vue'
import SelectButton from 'primevue/selectbutton'
import useMusicStore from '@/stores/music.store'

const store = useMusicStore()
const barsOptions = ref(['1', '2', '4', '8', '16'])

const selectedBars = computed({
  get: () => store.bars.toString(),
  set: (val) => store.setBars(Number(val))
})

const isEuclideanMode = computed(() => store.rhythm?.pulses !== undefined)
</script>

<template>
  <div class="flex items-center justify-between gap-4 mt-4">
    <label class="font-medium">Length (bars)</label>
    <SelectButton v-model="selectedBars" :options="barsOptions" :disabled="isEuclideanMode" />
  </div>
</template>
