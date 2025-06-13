<script setup lang="ts">
import { computed } from 'vue'
import useMusicStore from '@/stores/music.store'
import { convertTicksToNotation } from '@/utils/duration'

const store = useMusicStore()

const displayMelody = computed(() => {
  if (!store.melody?.notes.length) {
    return 'Generate a melody to see it here.'
  }

  return store.melody.notes
    .map((note) => {
      const pitch = note.pitch === null ? 'rest' : note.pitch
      const duration = convertTicksToNotation(note.duration)
      return `${pitch} (${duration})`
    })
    .join(' → ')
})
</script>

<template>
  <div class="flex flex-col gap-4 bg-zinc-800 rounded-lg p-4">
    <div class="flex items-center justify-center gap-2">
      <i class="pi pi-chart-line text-lg"></i>
      <span class="text-xl">Generated Melody</span>
    </div>
    <div class="p-4 rounded-lg border-l-4 border-primary-500">
      <p class="font-mono">
        {{ displayMelody }}
      </p>
    </div>
  </div>
</template>
