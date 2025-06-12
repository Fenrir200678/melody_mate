<script setup lang="ts">
import { computed } from 'vue'
import useMusicStore from '@/stores/music.store'
import Button from 'primevue/button'
import { generateScale } from '@/services/ScaleService'
import { mapMelodyToScale } from '@/utils/scales'
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

function convertMelodyToCurrentScale() {
  if (!store.melody?.notes.length) return
  const scale = generateScale(store.scaleName, store.key)
  if (!scale) return
  const newNotes = mapMelodyToScale(store.melody.notes, scale.notes)
  store.melody = { ...store.melody, notes: newNotes }
}
</script>

<template>
  <div class="flex flex-col gap-4 bg-zinc-800 rounded-lg p-4">
    <div class="flex items-center justify-center gap-2">
      <i class="pi pi-chart-line text-2xl"></i>
      <span>Generated Melody</span>
    </div>
    <div class="p-4 rounded-lg border-l-4 border-primary-500">
      <p class="text-sm font-mono">
        {{ displayMelody }}
      </p>
    </div>
    <div class="flex justify-end">
      <Button
        label="Convert to chosen scale"
        size="small"
        icon="pi pi-refresh"
        :disabled="!store.melody || !store.melody.notes.length"
        @click="convertMelodyToCurrentScale"
        severity="secondary"
      />
    </div>
  </div>
</template>
