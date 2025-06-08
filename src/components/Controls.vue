<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Select from 'primevue/select'
import useMusicStore from '@/stores/music.store'
import { instrumentOptions } from '@/services/AudioService'
import type { InstrumentKey } from '@/services/AudioService'

const store = useMusicStore()

const canPlay = computed(() => store.melody?.notes && store.melody.notes.length > 0)

const instrumentModel = computed({
  get: () => store.selectedInstrument,
  set: (value: InstrumentKey) => {
    store.setInstrument(value)
  }
})

const formattedInstrumentOptions = computed(() =>
  Object.entries(instrumentOptions).map(([value, label]) => ({
    label,
    value
  }))
)

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
      <div class="flex items-center gap-2">
        <i class="pi pi-play text-2xl"></i>
        <span>Playback & Export</span>
      </div>
    </template>
    <template #content>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="flex items-center justify-center gap-2">
          <label for="instrument-select" class="font-bold">Instrument</label>
          <Select
            id="instrument-select"
            v-model="instrumentModel"
            :options="formattedInstrumentOptions"
            option-label="label"
            option-value="value"
            placeholder="Select an Instrument"
            class="w-full"
          />
        </div>
        <div class="flex items-center justify-center gap-2">
          <Button label="Play" icon="pi pi-play" :disabled="!canPlay || store.isPlaying" @click="playMelody" />
          <Button
            label="Stop"
            icon="pi pi-stop"
            :disabled="!store.isPlaying"
            severity="secondary"
            @click="stopMelody"
          />
          <Button
            label="Download MIDI"
            icon="pi pi-download"
            :disabled="!canPlay"
            severity="success"
            @click="downloadMidi"
          />
        </div>
      </div>
    </template>
  </Card>
</template>
