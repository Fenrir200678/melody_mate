<script setup lang="ts">
import { useChordStore } from '@/stores/chord.store'
import { useChordVisualization } from '@/composables/useChordVisualization'

const chordStore = useChordStore()
const { getCompactChordName } = useChordVisualization()
</script>

<template>
  <div class="flex items-center justify-center gap-2">
    <div
      v-for="(chord, index) in chordStore.currentProgression"
      :key="index"
      class="p-2 bg-zinc-800 rounded-lg flex flex-col items-center"
    >
      <span class="font-bold">{{ getCompactChordName(chord.name) }}</span>
      <span class="text-xs text-zinc-400">{{ chord.notes.join(', ') }}</span>
    </div>
  </div>
</template>
