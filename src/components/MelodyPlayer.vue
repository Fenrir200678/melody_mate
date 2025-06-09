<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
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
  <div class="flex flex-col gap-4 mt-4">
    <div class="flex items-center justify-center gap-4">
      <Button
        class="w-[50%]"
        severity="success"
        label="Play"
        icon="pi pi-play"
        :disabled="!canPlay || store.isPlaying"
        @click="playMelody"
      />
      <Button
        class="w-[50%]"
        severity="danger"
        label="Stop"
        icon="pi pi-stop"
        :disabled="!store.isPlaying"
        @click="stopMelody"
      />
    </div>
    <Divider />
    <div class="flex items-center justify-center gap-2">
      <Button
        label="Download MIDI"
        icon="pi pi-download"
        :disabled="!canPlay"
        @click="downloadMidi"
        class="w-full"
        severity="success"
      />
    </div>
  </div>
</template>
