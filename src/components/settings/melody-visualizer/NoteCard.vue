<script setup lang="ts">
import { convertTicksToNotation } from '@/utils/duration'
import { getOctave, getOctaveColor, getNoteName, getVelocityOpacity, getMusicSymbol } from './useMelodyVisualization'
import type { AppNote } from '@/ts/models/AppNote'

interface Props {
  note: AppNote
  index: number
}

defineProps<Props>()
</script>

<template>
  <div
    class="note-display flex flex-col items-center gap-1 transition-all duration-200 hover:scale-110 cursor-default"
    :style="{
      opacity: note.pitch ? getVelocityOpacity(note.velocity) : 0.7
    }"
    :title="`${note.pitch || 'Rest'} - ${convertTicksToNotation(note.duration)} - Velocity: ${note.velocity}`"
  >
    <!-- Music Symbol -->
    <div
      class="music-symbol flex items-center justify-center gap-1 w-14 h-14 rounded-lg shadow-lg border text-white font-bold"
      :class="[note.pitch ? getOctaveColor(getOctave(note.pitch)) : 'bg-gray-600 border-dashed border-gray-400']"
    >
      <span class="text-2xl music-font">
        {{ note.pitch ? getMusicSymbol(note.duration).symbol : '𝄽' }}
      </span>
      <span v-if="getMusicSymbol(note.duration).isDotted" class="text-xl">•</span>
    </div>

    <!-- Note Information -->
    <div class="text-center">
      <div v-if="note.pitch" class="text-xs font-mono font-bold text-gray-200">
        {{ getNoteName(note.pitch) }}{{ getOctave(note.pitch) }}
      </div>
      <div v-else class="text-xs font-mono font-bold text-gray-200">Rest</div>
      <div class="text-xs text-gray-400">
        {{ convertTicksToNotation(note.duration) }}
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Music&display=swap');

.music-font {
  color: #fff;
  font-size: 2rem;
  font-family: 'Noto Music', serif;
  font-feature-settings: 'kern' 1;
}

.note-display {
  position: relative;
}

.music-symbol {
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.note-display:hover .music-symbol {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.6);
}

.note-display:hover {
  transform: scale(1.05);
}
</style>
