<script setup lang="ts">
import { ref, watch } from 'vue'
import SelectButton from 'primevue/selectbutton'
import useMusicStore from '@/stores/music.store'

const store = useMusicStore()
const barsOptions = ref(['1', '2', '3', '4', '5', '6', '7', '8'])
const selectedBars = ref<string>(store.bars.toString())

watch(selectedBars, (newVal) => {
  store.setBars(Number(newVal))
})
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <SelectButton v-model="selectedBars" :options="barsOptions" aria-labelledby="bars-selector" />
  </div>
</template>
