<script setup lang="ts">
import { getOctaveColor } from './useMelodyVisualization'

interface Props {
  usedOctaves: number[]
  hasRests: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="bg-zinc-900 rounded-lg p-3 space-y-3">
    <!-- Rhythm Information moved to RhythmInfoInline (always visible above player) -->

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
