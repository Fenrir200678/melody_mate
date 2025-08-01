<script setup lang="ts">
import { convertTicksToNotation } from '@/utils/duration'
import { getOctave, getOctaveColor, getNoteName, getVelocityOpacity, getMusicSymbol } from './useMelodyVisualization'
import type { AppNote } from '@/ts/models/AppNote'

interface Props {
  note: AppNote
  index: number
  isActive?: boolean
}

withDefaults(defineProps<Props>(), {
  isActive: false
})
</script>

<template>
  <div
    class="note-display flex flex-col items-center gap-1 transition-all duration-200 hover:scale-110 cursor-default"
    :class="{ 'playing-animation': isActive }"
    :style="{
      opacity: note.pitch ? getVelocityOpacity(note.velocity) : 0.7
    }"
    :title="`${note.pitch || 'Rest'} - ${convertTicksToNotation(note.duration)} - Velocity: ${note.velocity}`"
  >
    <!-- Music Symbol -->
    <div
      class="music-symbol flex items-baseline justify-center gap-1 w-14 h-14 rounded-lg shadow-lg border text-white font-bold transition-all duration-300"
      :class="[
        note.pitch ? getOctaveColor(getOctave(note.pitch)) : 'bg-gray-600 border-dashed border-gray-400',
        { 'playing-pulse': isActive, 'playing-glow': isActive }
      ]"
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

    <!-- Active indicator -->
    <div v-if="isActive" class="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
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

/* Playing animations */
.playing-animation {
  z-index: 10;
}

.playing-pulse {
  transform: scale(1.1);
  z-index: 10;
  animation: playingPulse 0.6s ease-in-out infinite alternate;
}

.playing-glow {
  box-shadow:
    0 0 20px rgba(255, 255, 255, 0.8),
    0 0 40px rgba(255, 255, 255, 0.6),
    0 0 60px rgba(255, 255, 255, 0.4) !important;
  border-color: rgba(255, 255, 255, 0.8) !important;
}

@keyframes playingPulse {
  0% {
    transform: scale(1.1);
    filter: brightness(1.2);
  }
  100% {
    transform: scale(1.15);
    filter: brightness(1.4);
  }
}

/* Ping animation for active indicator */
@keyframes ping {
  75%,
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

.animate-ping {
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}
</style>
