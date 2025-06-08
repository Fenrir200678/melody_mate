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

  // Set a default scale on mount
  if (availableScaleNames.value.length > 0) {
    const defaultScaleName = store.scaleName
    selectedScaleName.value = defaultScaleName
    store.setScaleName(defaultScaleName)
  }
})

function onScaleChange(value: string) {
  if (value) {
    selectedScaleName.value = value
    store.setScaleName(value)
  }
}
</script>

<template>
  <div class="flex justify-center">
    <Select
      v-model="selectedScaleName"
      :options="availableScaleNames"
      placeholder="Select a Scale"
      height="3rem"
      @update:modelValue="onScaleChange"
    />
  </div>
</template>
