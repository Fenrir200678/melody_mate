<script setup lang="ts">
import { computed, ref } from 'vue'
import 'html-midi-player'
import useMusicStore from '@/stores/music.store'
import { generalMidiInstruments } from '@/data/general-midi-instruments'

import Button from 'primevue/button'
import Divider from 'primevue/divider'
import ToggleSwitch from 'primevue/toggleswitch'
import Select from 'primevue/select'
import type { SelectChangeEvent } from 'primevue/select'

const store = useMusicStore()

const generalMidiInstrumentsOptions = ref(generalMidiInstruments)
const canPlay = computed(() => store.melody?.notes && store.melody.notes.length > 0)
const midiUrl = computed(() => store.midiUrl)
const loop = ref(false)
const isPlaying = ref(false)

async function changeInstrument(event: SelectChangeEvent) {
  store.setSelectedInstrument(event.value as number)
  await store.generateMidiFile()
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-4 w-full">
      <label class="text-zinc-400">Instrument:</label>
      <Select
        v-model="store.selectedInstrument"
        :options="generalMidiInstrumentsOptions"
        option-label="name"
        option-value="value"
        class="w-full"
        filter
        filter-placeholder="Search instrument"
        @change="changeInstrument"
      />
    </div>

    <div class="flex items-center justify-between gap-2 mb-2">
      <label class="text-zinc-400">Endless Loop:</label>
      <ToggleSwitch v-model="loop" />
    </div>

    <div class="flex flex-col items-start justify-center gap-4">
      <midi-player
        id="player"
        class="w-full midi-player"
        :src="midiUrl"
        sound-font
        :loop="loop"
        @start="isPlaying = true"
        @stop="isPlaying = false"
      />
    </div>
    <Divider />
    <div class="flex items-center justify-center gap-2">
      <Button
        label="Download MIDI"
        icon="pi pi-download"
        :disabled="!canPlay"
        @click="store.downloadMidiFile()"
        class="w-full"
        severity="success"
        size="large"
      />
    </div>
  </div>
</template>
