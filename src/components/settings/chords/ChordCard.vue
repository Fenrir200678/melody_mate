<script setup lang="ts">
import { computed } from 'vue'
import { useChordVisualization } from '@/composables/useChordVisualization'
import type { Chord } from '@/ts/models/Chord'
import Button from 'primevue/button'
import { useCompositionStore } from '@/stores/composition.store'
import { useChordStore } from '@/stores/chord.store'

interface Props {
  chord: Chord
  index?: number
  isActive?: boolean
  showRemoveButton?: boolean
  showRomanNumeral?: boolean
  showPositionNumeral?: boolean
  draggable?: boolean
  size?: 'small' | 'medium' | 'large'
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
  showRemoveButton: false,
  showRomanNumeral: true,
  showPositionNumeral: false,
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

const compositionStore = useCompositionStore()
const chordStore = useChordStore()

const {
  getChordQuality,
  getChordRoot,
  getChordQualityColor,
  getChordSymbol,
  getRomanNumeral,
  getChordTooltipInfo,
  getCompactChordName
} = useChordVisualization()

/**
 * Gets the simple roman numeral from the progression (I, V, vi, IV)
 */
function getProgressionRomanNumeral(index: number): string {
  if (chordStore.selectedProgressionType === 'predefined' && chordStore.selectedPredefinedProgressionName) {
    const progressionParts = chordStore.selectedPredefinedProgressionName.split('-')
    return progressionParts[index] || '?'
  } else {
    // For custom progressions, use position-based numerals
    const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']
    return numerals[index] || '?'
  }
}

const chordData = computed(() => {
  const quality = getChordQuality(props.chord.name)
  const root = getChordRoot(props.chord.name)
  const symbol = getChordSymbol(quality)
  const colorClass = getChordQualityColor(quality)
  const romanNumeral = getRomanNumeral(props.chord.name, compositionStore.key)
  const tooltip = getChordTooltipInfo(props.chord)
  const compactName = getCompactChordName(props.chord.name)

  return {
    quality,
    root,
    symbol,
    colorClass,
    romanNumeral,
    tooltip,
    compactName
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

      <!-- Compact chord name (small overlay) -->
      <div
        v-if="showRomanNumeral"
        class="absolute -top-1 -right-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded-sm font-mono"
      >
        {{ chordData.compactName }}
      </div>

      <!-- Active indicator -->
      <div v-if="isActive" class="absolute -top-1 -left-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
    </div>

    <!-- Remove Button -->
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
        {{ chordData.compactName }}
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
      <!-- Progression Roman Numeral -->
      <div v-if="showPositionNumeral && index !== undefined" class="text-xs text-amber-400 font-mono mt-1">
        {{ getProgressionRomanNumeral(index) }}
      </div>
    </div>
  </div>
</template>
