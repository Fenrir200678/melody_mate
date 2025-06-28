<script setup lang="ts">
import { computed } from 'vue'
import {
  getChordQuality,
  getChordRoot,
  getChordQualityColor,
  getChordSymbol,
  getRomanNumeral,
  getChordTooltipInfo
} from './useChordVisualization'
import type { Chord } from '@/ts/models/Chord'
import Button from 'primevue/button'

interface Props {
  chord: Chord
  index?: number
  isActive?: boolean
  showRemoveButton?: boolean
  showRomanNumeral?: boolean
  draggable?: boolean
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
  showRemoveButton: false,
  showRomanNumeral: true,
  draggable: false,
  size: 'medium'
})

const emit = defineEmits<{
  remove: [index: number]
  click: [chord: Chord]
  dragstart: [event: DragEvent]
  dragover: [event: DragEvent]
  drop: [event: DragEvent]
  dragenter: [event: DragEvent]
}>()

const chordData = computed(() => {
  const quality = getChordQuality(props.chord.name)
  const root = getChordRoot(props.chord.name)
  const symbol = getChordSymbol(quality)
  const colorClass = getChordQualityColor(quality)
  const romanNumeral = getRomanNumeral(props.chord.name)
  const tooltip = getChordTooltipInfo(props.chord)

  return {
    quality,
    root,
    symbol,
    colorClass,
    romanNumeral,
    tooltip
  }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'small':
      return {
        container: 'w-12 h-12',
        symbol: 'text-lg',
        text: 'text-xs'
      }
    case 'large':
      return {
        container: 'w-20 h-20',
        symbol: 'text-3xl',
        text: 'text-sm'
      }
    default: // medium
      return {
        container: 'w-16 h-16',
        symbol: 'text-2xl',
        text: 'text-xs'
      }
  }
})

function handleRemove() {
  if (props.index !== undefined) {
    emit('remove', props.index)
  }
}

function handleClick() {
  emit('click', props.chord)
}

// Drag & Drop event handlers
function handleDragStart(event: DragEvent) {
  if (props.draggable) {
    emit('dragstart', event)
  }
}

function handleDragOver(event: DragEvent) {
  if (props.draggable) {
    event.preventDefault()
    emit('dragover', event)
  }
}

function handleDrop(event: DragEvent) {
  if (props.draggable) {
    event.preventDefault()
    event.stopPropagation()
    emit('drop', event)
  }
}

function handleDragEnter(event: DragEvent) {
  if (props.draggable) {
    event.preventDefault()
    emit('dragenter', event)
  }
}
</script>

<template>
  <div
    class="chord-display flex flex-col items-center gap-2 transition-all duration-200 hover:scale-105"
    :class="{
      'playing-animation': isActive,
      'cursor-grab': draggable,
      'cursor-pointer': !draggable
    }"
    :title="chordData.tooltip"
    :draggable="draggable"
    @click="handleClick"
    @dragstart="handleDragStart"
    @dragover="handleDragOver"
    @drop="handleDrop"
    @dragenter="handleDragEnter"
  >
    <!-- Chord Symbol Card -->
    <div
      class="chord-symbol flex flex-col items-center justify-center rounded-lg shadow-lg border text-white font-bold transition-all duration-300 relative"
      :class="[chordData.colorClass, sizeClasses.container, { 'playing-pulse': isActive, 'playing-glow': isActive }]"
    >
      <!-- Musical Symbol -->
      <div class="flex items-center justify-center" :class="sizeClasses.symbol">
        {{ chordData.symbol }}
      </div>

      <!-- Roman Numeral (small overlay) -->
      <div
        v-if="showRomanNumeral"
        class="absolute -top-1 -right-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded-sm font-mono"
      >
        {{ chordData.romanNumeral }}
      </div>

      <!-- Active indicator -->
      <div v-if="isActive" class="absolute -top-1 -left-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
    </div>

    <!-- Remove Button (außerhalb der Card) -->
    <Button
      v-if="showRemoveButton"
      icon="pi pi-times"
      severity="secondary"
      text
      rounded
      size="small"
      class="absolute bottom-0 right-0 bg-red-500 text-white hover:bg-red-600 shadow-lg z-20"
      @click.stop="handleRemove"
    />

    <!-- Chord Information -->
    <div class="text-center">
      <div class="font-mono font-bold text-gray-200" :class="sizeClasses.text">
        {{ chord.name }}
      </div>
      <div v-if="size !== 'small'" class="text-xs text-gray-500">
        {{
          chordData.quality === 'M'
            ? 'Major'
            : chordData.quality === 'm'
              ? 'Minor'
              : chordData.quality === 'dim'
                ? 'Dim'
                : chordData.quality === 'aug'
                  ? 'Aug'
                  : chordData.quality
        }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.chord-display {
  position: relative;
}

.chord-symbol {
  backdrop-filter: blur(4px);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.chord-display:hover .chord-symbol {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.6);
}

.chord-display:hover {
  transform: scale(1.05);
}

/* Playing animations */
.playing-animation {
  z-index: 10;
}

.playing-pulse {
  transform: scale(1.1);
  z-index: 10;
  animation: playingPulse 0.8s ease-in-out infinite alternate;
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

/* Drag cursor when draggable */
.cursor-grab:active {
  cursor: grabbing;
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
