<script setup lang="ts">
import { computed } from 'vue'
import Card from 'primevue/card'
import useMusicStore from '@/stores/music.store'
import Button from 'primevue/button'
import { generateScale } from '@/services/ScaleService'
import { mapMelodyToScale } from '@/utils/scales'

const store = useMusicStore()

const displayMelody = computed(() => {
  if (!store.melody?.notes.length) {
    return 'Generate a melody to see it here.'
  }

  return store.melody.notes.map((note) => `${note.pitch} (${note.duration})`).join(' → ')
})

function convertMelodyToCurrentScale() {
  if (!store.melody?.notes.length) return
  const scale = generateScale(store.scaleName, store.key)
  if (!scale) return
  const newNotes = mapMelodyToScale(store.melody.notes, scale.notes)
  store.melody = { ...store.melody, notes: newNotes }
}
</script>

<template>
  <Card>
    <template #title>
      <div class="flex items-center justify-center gap-2">
        <i class="pi pi-chart-line text-2xl"></i>
        <span>Generated Melody</span>
      </div>
    </template>
    <template #content>
      <div class="bg-surface-100 dark:bg-surface-800 p-4 rounded-lg border-l-4 border-primary-500">
        <p class="text-center text-sm text-surface-600 dark:text-surface-300 font-mono">
          {{ displayMelody }}
        </p>
        <div class="flex justify-center mt-4">
          <Button
            label="Convert to chosen scale"
            icon="pi pi-refresh"
            :disabled="!store.melody || !store.melody.notes.length"
            @click="convertMelodyToCurrentScale"
            severity="secondary"
          />
        </div>
      </div>
    </template>
  </Card>
</template>
