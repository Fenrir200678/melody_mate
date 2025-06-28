<script setup lang="ts">
import { computed } from 'vue'
import { getOctaveColor } from './useMelodyVisualization'
import { useRhythmStore } from '@/stores/rhythm.store'
import { useMelodyStore } from '@/stores/melody.store'

interface Props {
  usedOctaves: number[]
  hasRests: boolean
}

defineProps<Props>()

const rhythmStore = useRhythmStore()
const melodyStore = useMelodyStore()

// Helper function to check if rhythm is custom
function isCustomRhythm(rhythm: any): boolean {
  return rhythm && (rhythm.isCustom === true || rhythm.name === 'Custom')
}

// Generate rhythm display text based on the rhythm used for the current melody
const rhythmDisplayText = computed(() => {
  // Only show rhythm info if we have a melody and the rhythm that was used for it
  if (!melodyStore.melody || !melodyStore.lastUsedRhythm) {
    return null
  }

  const rhythm = melodyStore.lastUsedRhythm

  // Check if it was a custom rhythm using our custom marker
  if (isCustomRhythm(rhythm)) {
    return 'Custom'
  }

  // Return the rhythm name
  return rhythm.name
})

// Generate rhythm icon based on type
const rhythmIcon = computed(() => {
  if (!melodyStore.lastUsedRhythm) {
    return 'pi-music-note'
  }

  const rhythm = melodyStore.lastUsedRhythm

  // Check for custom rhythm using our custom marker
  if (isCustomRhythm(rhythm)) {
    return 'pi-cog'
  }

  if (rhythm.category === 'euclidean') {
    return 'pi-chart-pie'
  }

  return 'pi-asterisk'
})

// Check if we should show euclidean rotation info
const showEuclideanRotation = computed(() => {
  return melodyStore.lastUsedRhythm?.category === 'euclidean' && rhythmStore.euclideanRotation > 0
})
</script>

<template>
  <div class="bg-zinc-900 rounded-lg p-3 space-y-3">
    <!-- Rhythm Information - only show if melody exists -->
    <div v-if="rhythmDisplayText" class="border-b border-zinc-700 pb-3">
      <div class="flex items-center gap-2 text-sm">
        <i :class="`pi ${rhythmIcon} text-blue-400`"></i>
        <span class="text-gray-200 font-semibold">Rhythm:</span>
        <span class="text-blue-300 font-medium">{{ rhythmDisplayText }}</span>
        <span v-if="showEuclideanRotation" class="text-xs text-gray-400">
          (rotated {{ rhythmStore.euclideanRotation }})
        </span>
      </div>
    </div>

    <!-- Octaves Information -->
    <div>
      <h4 class="text-sm font-semibold mb-2 text-gray-200">Octaves in Melody:</h4>
      <div class="flex flex-wrap gap-3 text-xs">
        <div v-for="octave in usedOctaves" :key="octave" class="flex items-center gap-1">
          <div class="w-3 h-3 rounded border" :class="getOctaveColor(octave)"></div>
          <span class="text-gray-400">Oct {{ octave }}</span>
        </div>
        <div v-if="hasRests" class="flex items-center gap-1">
          <div class="w-3 h-3 bg-gray-600 border border-dashed border-gray-400 rounded"></div>
          <span class="text-gray-400">Rest</span>
        </div>
      </div>
    </div>

    <!-- Legend Information -->
    <div class="flex flex-wrap gap-4 text-xs text-gray-500 pt-2 border-t border-zinc-700">
      <span>Symbols = note duration</span>
      <span>• = dotted note</span>
      <span>Transparency = velocity</span>
    </div>
  </div>
</template>
