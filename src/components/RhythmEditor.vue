<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Select from 'primevue/select'
import useMusicStore from '@/stores/music.store'
import { PREDEFINED_RHYTHMS } from '@/services/RhythmService'
import type { RhythmPattern } from '@/models'

type PredefinedRhythm = {
  name: string
  pattern: RhythmPattern
}

const store = useMusicStore()
const availableRhythms = ref<PredefinedRhythm[]>(PREDEFINED_RHYTHMS)
const selectedRhythm = ref<PredefinedRhythm | null>(null)

onMounted(() => {
  // Set a default rhythm on mount
  if (availableRhythms.value.length > 0) {
    const defaultRhythm = availableRhythms.value[0]
    selectedRhythm.value = defaultRhythm
    store.setRhythm(defaultRhythm.pattern)
  }
})

function onRhythmChange(value: PredefinedRhythm) {
  if (value) {
    selectedRhythm.value = value
    store.setRhythm(value.pattern)
  }
}
</script>

<template>
  <div class="flex justify-center">
    <Select
      v-model="selectedRhythm"
      :options="availableRhythms"
      optionLabel="name"
      placeholder="Select a Rhythm"
      @update:modelValue="onRhythmChange"
    />
  </div>
</template>
