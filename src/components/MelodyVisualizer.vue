<script setup lang="ts">
import { computed } from 'vue'
import { useMelodyStore } from '@/stores/melody.store'
import { getOctave } from './settings/melody-visualizer/useMelodyVisualization'
import { usePlaybackVisualization } from './settings/melody-visualizer/usePlaybackVisualization'
import NoteCard from './settings/melody-visualizer/NoteCard.vue'
import VisualizerLegend from './settings/melody-visualizer/VisualizerLegend.vue'

const melodyStore = useMelodyStore()
const { currentNoteIndex, isPlaying, isNoteActive, progress } = usePlaybackVisualization()

const displayNotes = computed(() => {
  if (!melodyStore.melody?.notes.length) {
    return []
  }
  return melodyStore.melody.notes
})

const hasNotes = computed(() => displayNotes.value.length > 0)

// Get unique octaves used in the melody
const usedOctaves = computed(() => {
  if (!hasNotes.value) return []

  const octaves = new Set<number>()
  displayNotes.value.forEach((note) => {
    if (note.pitch) {
      octaves.add(getOctave(note.pitch))
    }
  })

  return Array.from(octaves).sort((a, b) => a - b)
})

// Check if melody has rests
const hasRests = computed(() => {
  return displayNotes.value.some((note) => !note.pitch)
})
</script>

<template>
  <div class="flex flex-col gap-4 bg-zinc-800 rounded-lg p-4">
    <div class="flex items-center justify-center gap-2">
      <i class="pi pi-chart-line text-lg"></i>
      <span class="text-xl">Generated Melody</span>
      <div v-if="isPlaying" class="flex items-center gap-2 ml-4">
        <i class="pi pi-play text-green-400 animate-pulse"></i>
        <span class="text-sm text-green-400">Playing</span>
      </div>
    </div>

    <!-- Progress Bar -->
    <div v-if="hasNotes && isPlaying" class="w-full bg-zinc-700 rounded-full h-2">
      <div
        class="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-300"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>

    <div v-if="!hasNotes" class="p-8 text-center text-gray-200 border-2 border-dashed border-gray-600 rounded-lg">
      <i class="pi pi-music-note text-3xl mb-2 block"></i>
      <p>Generate a melody to see it here.</p>
    </div>

    <div v-else class="space-y-4">
      <!-- Notes Display -->
      <div class="flex flex-wrap gap-2 p-4 bg-zinc-900 rounded-lg items-end justify-center">
        <NoteCard
          v-for="(note, index) in displayNotes"
          :key="index"
          :note="note"
          :index="index"
          :is-active="isNoteActive(index)"
        />
      </div>

      <!-- Legend -->
      <VisualizerLegend :used-octaves="usedOctaves" :has-rests="hasRests" />

      <!-- Playback info -->
      <div v-if="isPlaying" class="text-xs text-center text-gray-400">
        <span>Currently playing note {{ currentNoteIndex + 1 }} of {{ displayNotes.length }}</span>
      </div>
    </div>
  </div>
</template>
