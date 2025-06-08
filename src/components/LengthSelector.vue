<script setup lang="ts">
import { ref } from 'vue'
import SelectButton from 'primevue/selectbutton'
import useMusicStore from '@/stores/music.store'

const store = useMusicStore()
const barsOptions = ref(['1', '2', '3', '4', '5', '6', '7', '8'])
const selectedBars = ref<string>(store.bars.toString())
</script>

<template>
  <SelectButton v-model="selectedBars" :options="barsOptions" @update:modelValue="store.setBars(Number($event))" />
</template>
