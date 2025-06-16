<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useMelodyStore } from '@/stores/melody.store'
import { usePlayerStore } from '@/stores/player.store'
import { generalMidiInstruments, type GeneralMidiInstrument } from '@/data/general-midi-instruments'

import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import type { SelectChangeEvent } from 'primevue/select'

onMounted(async () => {
  await import('html-midi-player')
})

const melodyStore = useMelodyStore()
const playerStore = usePlayerStore()

const instruments = ref<GeneralMidiInstrument[]>(generalMidiInstruments)
const selectedInstrument = ref<GeneralMidiInstrument['items'][number] | null>(null)
const canPlay = computed(() => melodyStore.melody?.notes && melodyStore.melody.notes.length > 0)
const midiUrl = computed(() => melodyStore.midiUrl)

async function changeInstrument(event: SelectChangeEvent) {
  playerStore.setSelectedInstrument(event.value.value as number)
  await melodyStore.generateMidiFile()
}

onMounted(() => {
  const instrument = instruments.value.find((group) =>
    group.items.find((item) => item.value === playerStore.selectedInstrument)
  )

  if (instrument) {
    selectedInstrument.value = instrument.items.find((item) => item.value === playerStore.selectedInstrument) || null
  }
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-4 w-full mb-2">
      <label class="text-zinc-400">Instrument:</label>
      <Select
        v-model="selectedInstrument"
        :options="instruments"
        filter
        optionLabel="name"
        optionGroupLabel="label"
        optionGroupChildren="items"
        class="w-full"
        @change="changeInstrument"
      >
        <template #optiongroup="slotProps">
          <div class="flex items-center gap-2 mt-4 border-b border-zinc-700 pb-2 font-bold">
            <span class="text-zinc-400">{{ slotProps.option.label }}</span>
          </div>
        </template>
      </Select>
    </div>

    <div class="flex items-start justify-center gap-4 w-full">
      <midi-player
        id="player"
        class="w-full midi-player"
        :src="midiUrl"
        sound-font
        loop
        @start="playerStore.setIsPlaying(true)"
        @stop="playerStore.setIsPlaying(false)"
      />
      <div class="flex flex-col items-center justify-center gap-2">
        <label for="loop" class="text-zinc-400">Loop:</label>
        <ToggleSwitch :modelValue="playerStore.loop" inputId="loop" @update:modelValue="playerStore.setLoop" />
      </div>
    </div>

    <Divider />
    <div class="flex items-center justify-center gap-2">
      <Button
        label="Download MIDI"
        icon="pi pi-download"
        :disabled="!canPlay"
        @click="melodyStore.downloadMidiFile()"
        class="w-full"
        severity="success"
        size="large"
      />
    </div>
  </div>
</template>
