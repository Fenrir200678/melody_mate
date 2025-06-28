<script setup lang="ts">
import { computed, watch } from 'vue'
import { useCompositionStore } from '@/stores/composition.store'
import { useChordStore } from '@/stores/chord.store'
import { getDiatonicTriads } from '@/services/ChordService'
import ChordCard from './ChordCard.vue'
import type { Chord } from '@/ts/models/Chord'

defineProps<{ disabled: boolean }>()

const compositionStore = useCompositionStore()
const chordStore = useChordStore()

const diatonicChords = computed<Chord[]>(() => {
  const chords = getDiatonicTriads(compositionStore.key || '', compositionStore.scaleName || '')
  return chords
})

function addChord(chord: Chord) {
  chordStore.addChordToProgression(chord)
}

// Drag and Drop functionality for adding chords from palette
function handleDragStart(event: DragEvent, chord: Chord) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/chord-data', JSON.stringify(chord))
    event.dataTransfer.effectAllowed = 'copy'
  }
}

// Update chords when key or scale changes
watch(
  () => [compositionStore.key, compositionStore.scaleName],
  () => {
    // Optionally clear current progression or re-evaluate based on new scale
    // For now, we'll just ensure the palette updates.
  },
  { immediate: true }
)
</script>

<template>
  <div class="space-y-4">
    <div class="text-sm text-zinc-400 font-medium">Available Diatonic Triads:</div>

    <div
      class="flex flex-wrap gap-3 p-4 border border-zinc-700 rounded-lg bg-zinc-800 min-h-[120px] items-start"
      :class="{ 'opacity-50 pointer-events-none': disabled }"
    >
      <ChordCard
        v-for="(chord, index) in diatonicChords"
        :key="chord.name"
        :chord="chord"
        :index="index"
        size="small"
        :draggable="!disabled"
        :show-roman-numeral="true"
        :show-position-numeral="true"
        class="transition-transform hover:scale-110"
        @click="addChord"
        @dragstart="(event: DragEvent) => handleDragStart(event, chord)"
      />

      <div
        v-if="diatonicChords.length === 0"
        class="w-full flex items-center justify-center text-zinc-500 text-sm italic py-8"
      >
        <div class="text-center">
          <i class="pi pi-music-note text-2xl mb-2 block"></i>
          <p>Select a key and scale to see available chords</p>
        </div>
      </div>
    </div>
  </div>
</template>
