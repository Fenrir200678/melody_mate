<script setup lang="ts">
import { computed, watch } from 'vue'
import { useCompositionStore } from '@/stores/composition.store'
import { useChordStore } from '@/stores/chord.store'
import { getDiatonicTriads } from '@/services/ChordService'
import Button from 'primevue/button'
import type { Chord } from '@/ts/models/Chord'

const compositionStore = useCompositionStore()
const chordStore = useChordStore()

const diatonicChords = computed<Chord[]>(() => {
  const chords = getDiatonicTriads(compositionStore.key || '', compositionStore.scaleName || '')
  return chords
})

function addChord(chord: Chord) {
  chordStore.addChordToProgression(chord)
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
  <div class="flex flex-wrap gap-2 p-4 border border-zinc-700 rounded-lg bg-zinc-800">
    <span class="text-sm text-zinc-400 w-full mb-2">Available Diatonic Triads:</span>
    <Button
      v-for="chord in diatonicChords"
      :key="chord.name"
      :label="chord.name"
      size="small"
      severity="secondary"
      outlined
      @click="addChord(chord)"
    />
  </div>
</template>
