<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Select from 'primevue/select'
import useMusicStore from '@/stores/music.store'
import { getAvailableScaleNames } from '@/services/ScaleService'

const store = useMusicStore()
const availableScaleNames = ref<string[]>([])
const selectedScaleName = ref<string | null>(null)

onMounted(() => {
  availableScaleNames.value = getAvailableScaleNames()
  selectedScaleName.value = store.scaleName
})

function onScaleChange(value: string) {
  if (value) {
    selectedScaleName.value = value
    store.setScaleName(value)
  }
}
</script>

<template>
  <Select
    class="w-[50%]"
    v-model="selectedScaleName"
    :options="availableScaleNames"
    placeholder="Select a Scale"
    height="3rem"
    filter
    @update:modelValue="onScaleChange"
  />
</template>
