<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useMelodyGeneration } from '@/composables/useMelodyGeneration'
import { usePlayerStore } from '@/stores/player.store'
import { generalMidiInstruments, type GeneralMidiInstrument } from '@/data/general-midi-instruments'
import RhythmInfoInline from '@/components/common/RhythmInfoInline.vue'

// Divider removed after layout changes
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import type { SelectChangeEvent } from 'primevue/select'
import { useUiStore } from '@/stores/ui.store'

const { midiUrl, generateMidiFile } = useMelodyGeneration()
const playerStore = usePlayerStore()
const ui = useUiStore()

const loop = ref(false)
const instruments = ref<GeneralMidiInstrument[]>(generalMidiInstruments)
const selectedInstrument = ref<GeneralMidiInstrument['items'][number] | null>(null)
// const canPlay = computed(() => melody.value?.notes && melody.value.notes.length > 0)

async function changeInstrument(event: SelectChangeEvent) {
  playerStore.setSelectedInstrument(event.value.value as number)
  await generateMidiFile()
}

onMounted(async () => {
  await import('html-midi-player')

  const instrument = instruments.value.find((group) =>
    group.items.find((item) => item.value === playerStore.selectedInstrument)
  )

  if (instrument) {
    selectedInstrument.value = instrument.items.find((item) => item.value === playerStore.selectedInstrument) || null
  }

  const player = document.getElementById('midi-player') as HTMLElement
  if (player) {
    if (loop.value) {
      player.setAttribute('loop', 'true')
    } else {
      player.removeAttribute('loop')
    }
  }
})

watch(loop, (newVal) => {
  const player = document.getElementById('midi-player') as HTMLElement
  if (player) {
    if (newVal) {
      player.setAttribute('loop', 'true')
    } else {
      player.removeAttribute('loop')
    }
  }
})

function uiNavigateToRhythm() {
  ui.navigateTo('rhythm', 'rhythm')
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <RhythmInfoInline @navigateRhythm="uiNavigateToRhythm" />
    <div class="flex items-center justify-between gap-4 w-full">
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
        id="midi-player"
        class="w-full midi-player"
        :src="midiUrl"
        sound-font
        @start="playerStore.setIsPlaying(true)"
        @stop="playerStore.setIsPlaying(false)"
      />
      <div class="flex flex-col items-center justify-center gap-2">
        <label for="loop" class="text-zinc-400">Loop:</label>
        <ToggleSwitch :modelValue="loop" inputId="loop" @update:modelValue="loop = !loop" />
      </div>
    </div>
    <!-- Download moved to left column (Generate block) -->
  </div>
</template>
