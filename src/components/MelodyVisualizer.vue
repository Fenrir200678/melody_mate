<script setup lang="ts">
import { computed } from 'vue'
import Card from 'primevue/card'
import useMusicStore from '@/stores/music.store'

const store = useMusicStore()

const displayMelody = computed(() => {
  if (!store.melody?.notes.length) {
    return 'Generate a melody to see it here.'
  }

  return store.melody.notes.map((note) => `${note.pitch} (${note.duration})`).join(' → ')
})
</script>

<template>
  <Card>
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-chart-line text-2xl"></i>
        <span>Generated Melody</span>
      </div>
    </template>
    <template #content>
      <div class="bg-surface-100 dark:bg-surface-800 p-4 rounded-lg border-l-4 border-primary-500">
        <p class="text-center text-sm text-surface-600 dark:text-surface-300 font-mono">
          {{ displayMelody }}
        </p>
      </div>
    </template>
  </Card>
</template>
