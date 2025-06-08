<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Divider from 'primevue/divider'

import useMusicStore from '@/stores/music.store'

const store = useMusicStore()

const canPlay = computed(() => store.melody?.notes && store.melody.notes.length > 0)

const playMelody = () => {
  store.playMelody()
}

const stopMelody = () => {
  store.stopMelody()
}

const downloadMidi = () => {
  store.exportMidi()
}
</script>

<template>
  <Card>
    <template #title>
      <div class="flex items-center justify-center gap-2 mb-4">
        <i class="pi pi-play text-2xl"></i>
        <span>Playback & Export</span>
      </div>
    </template>
    <template #content>
      <div class="flex items-center justify-center gap-2 mb-4">
        <Button
          class="w-50"
          label="Play"
          icon="pi pi-play"
          :disabled="!canPlay || store.isPlaying"
          @click="playMelody"
        />
        <Button
          class="w-50"
          label="Stop"
          icon="pi pi-stop"
          :disabled="!store.isPlaying"
          severity="secondary"
          @click="stopMelody"
        />
      </div>
      <Divider />
      <div class="flex items-center justify-center gap-2">
        <Button
          label="Download MIDI"
          icon="pi pi-download"
          :disabled="!canPlay"
          severity="success"
          @click="downloadMidi"
        />
      </div>
    </template>
  </Card>
</template>
