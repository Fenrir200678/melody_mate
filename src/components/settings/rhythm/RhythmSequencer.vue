<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRhythmSelection } from '@/composables/useRhythmSelection'
import { NOTE_DURATIONS } from '@/ts/consts'
import RhythmSequencerControls from './RhythmSequencerControls.vue'
import RhythmNotePalette from './RhythmNotePalette.vue'
import RhythmSequencerGrid from './RhythmSequencerGrid.vue'
import RhythmSequencerHelp from './RhythmSequencerHelp.vue'

const props = defineProps<{
  rhythmTabSelected: boolean
}>()

const { customRhythmSequence, useCustomRhythm, setStepDuration, clearCustomRhythm, toggleCustomRhythm } =
  useRhythmSelection()

// Available note values for the palette
const noteValues = [
  { name: '1/16', duration: NOTE_DURATIONS.SIXTEENTH, color: 'bg-blue-500', hoverColor: 'hover:bg-blue-400' },
  {
    name: '1/16.',
    duration: NOTE_DURATIONS.DOTTED_SIXTEENTH,
    color: 'bg-blue-700',
    hoverColor: 'hover:bg-blue-600'
  },
  { name: '1/8', duration: NOTE_DURATIONS.EIGHTH, color: 'bg-green-500', hoverColor: 'hover:bg-green-400' },
  {
    name: '1/8.',
    duration: NOTE_DURATIONS.DOTTED_EIGHTH,
    color: 'bg-green-700',
    hoverColor: 'hover:bg-green-600'
  },
  { name: '1/4', duration: NOTE_DURATIONS.QUARTER, color: 'bg-yellow-500', hoverColor: 'hover:bg-yellow-400' },
  {
    name: '1/4.',
    duration: NOTE_DURATIONS.DOTTED_QUARTER,
    color: 'bg-yellow-700',
    hoverColor: 'hover:bg-yellow-600'
  },
  { name: '1/2', duration: NOTE_DURATIONS.HALF, color: 'bg-orange-500', hoverColor: 'hover:bg-orange-400' },
  {
    name: '1/2.',
    duration: NOTE_DURATIONS.DOTTED_HALF,
    color: 'bg-orange-700',
    hoverColor: 'hover:bg-orange-600'
  },
  { name: '1/1', duration: NOTE_DURATIONS.WHOLE, color: 'bg-red-500', hoverColor: 'hover:bg-red-400' }
]

// Drag & Drop state
const draggedItem = ref<{ type: 'palette' | 'step'; noteValue?: (typeof noteValues)[0]; stepIndex?: number } | null>(
  null
)
const dropTargetIndex = ref<number | null>(null)

// Currently selected note value (for click interaction)
const selectedNoteValue = ref(noteValues[0])

// Computed properties for better organization
const groupedSteps = computed(() => {
  const groups = []
  for (let i = 0; i < customRhythmSequence.value.length; i += 4) {
    groups.push(customRhythmSequence.value.slice(i, i + 4))
  }
  return groups
})

// Drag handlers for palette items
function handlePaletteDragStart(event: DragEvent, noteValue: (typeof noteValues)[0]) {
  draggedItem.value = { type: 'palette', noteValue }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('text/plain', noteValue.name)
  }
}

// Drag handlers for step items
function handleStepDragStart(event: DragEvent, stepIndex: number) {
  const step = customRhythmSequence.value[stepIndex]
  if (step <= 0) return // Don't allow dragging empty or occupied steps

  const noteValue = noteValues.find((nv) => nv.duration === step)
  if (!noteValue) return

  draggedItem.value = { type: 'step', noteValue, stepIndex }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', noteValue.name)
  }
}

function handleStepDragOver(event: DragEvent, stepIndex: number) {
  event.preventDefault()
  if (draggedItem.value) {
    dropTargetIndex.value = stepIndex
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = draggedItem.value.type === 'palette' ? 'copy' : 'move'
    }
  }
}

function handleStepDragLeave() {
  dropTargetIndex.value = null
}

function handleStepDrop(event: DragEvent, stepIndex: number) {
  event.preventDefault()

  if (!draggedItem.value) return

  const targetStep = customRhythmSequence.value[stepIndex]
  if (targetStep === -1) return // Can't drop on occupied steps

  if (draggedItem.value.type === 'palette' && draggedItem.value.noteValue) {
    // Drop from palette - add note
    setStepDuration(stepIndex, draggedItem.value.noteValue.duration)
  } else if (draggedItem.value.type === 'step' && draggedItem.value.stepIndex !== undefined) {
    // Drop from step - move note
    const sourceIndex = draggedItem.value.stepIndex
    const sourceDuration = customRhythmSequence.value[sourceIndex]

    if (sourceIndex !== stepIndex) {
      setStepDuration(sourceIndex, 0) // Clear source
      setStepDuration(stepIndex, sourceDuration) // Set target
    }
  }

  draggedItem.value = null
  dropTargetIndex.value = null
}

function handleDragEnd() {
  draggedItem.value = null
  dropTargetIndex.value = null
}

// Click handlers (fallback for non-drag interaction)
function handleStepClick(index: number) {
  const value = customRhythmSequence.value[index]
  if (value === -1) return // occupied by longer note

  // If step is already active with current note value, clear it
  if (value === selectedNoteValue.value.duration) {
    setStepDuration(index, 0)
  } else {
    // Set to current selected note value
    setStepDuration(index, selectedNoteValue.value.duration)
  }
}

function selectNoteValue(noteValue: (typeof noteValues)[0]) {
  selectedNoteValue.value = noteValue
}

function getStepColor(step: number, stepIndex: number) {
  const isDropTarget = dropTargetIndex.value === stepIndex
  const isDragSource = draggedItem.value?.type === 'step' && draggedItem.value.stepIndex === stepIndex

  if (step === 0) {
    // Rest/empty step
    return `bg-zinc-700 border-zinc-600 hover:bg-zinc-600 ${isDropTarget ? 'ring-2 ring-blue-400 bg-zinc-600' : ''} ${isDragSource ? 'opacity-50' : ''}`
  }

  if (step === -1) {
    // Occupied by longer note
    return 'bg-zinc-200/40 border-zinc-300 cursor-not-allowed'
  }

  // Find matching note value color
  const noteValue = noteValues.find((nv) => nv.duration === step)
  const baseColor = noteValue
    ? `${noteValue.color} ${noteValue.hoverColor} border-opacity-70`
    : 'bg-primary-500 border-primary-700 hover:bg-primary-400'

  return `${baseColor} ${isDropTarget ? 'ring-2 ring-white scale-105' : ''} ${isDragSource ? 'opacity-50' : ''}`
}

function getStepLabel(step: number) {
  if (step <= 0) return ''
  const noteValue = noteValues.find((nv) => nv.duration === step)
  return noteValue ? noteValue.name : ''
}

function handleClearCustomRhythm() {
  clearCustomRhythm()
}

function handleToggleCustomRhythm(value: boolean) {
  toggleCustomRhythm(value)
}

// Trash zone for deleting notes
function handleTrashDragOver(event: DragEvent) {
  if (draggedItem.value?.type === 'step') {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }
}

function handleTrashDrop(event: DragEvent) {
  event.preventDefault()
  if (draggedItem.value?.type === 'step' && draggedItem.value.stepIndex !== undefined) {
    setStepDuration(draggedItem.value.stepIndex, 0)
  }
  draggedItem.value = null
}

watch(
  () => props.rhythmTabSelected,
  (newVal) => {
    if (newVal) {
      toggleCustomRhythm(true)
    }
  }
)
</script>

<template>
  <div class="flex flex-col gap-6 w-full">
    <!-- Header Controls ausgelagert -->
    <RhythmSequencerControls
      :useCustomRhythm="useCustomRhythm"
      :handleToggleCustomRhythm="handleToggleCustomRhythm"
      :handleClearCustomRhythm="handleClearCustomRhythm"
      :handleTrashDragOver="handleTrashDragOver"
      :handleTrashDrop="handleTrashDrop"
    />
    <!-- Note Value Palette ausgelagert -->
    <RhythmNotePalette
      :noteValues="noteValues"
      :selectedNoteValue="selectedNoteValue"
      :selectNoteValue="selectNoteValue"
      :handlePaletteDragStart="handlePaletteDragStart"
      :handleDragEnd="handleDragEnd"
    />
    <!-- Sequencer Grid ausgelagert -->
    <RhythmSequencerGrid
      :groupedSteps="groupedSteps"
      :getStepColor="getStepColor"
      :getStepLabel="getStepLabel"
      :dropTargetIndex="dropTargetIndex"
      :draggedItem="draggedItem"
      :handleStepClick="handleStepClick"
      :handleStepDragStart="handleStepDragStart"
      :handleStepDragOver="handleStepDragOver"
      :handleStepDragLeave="handleStepDragLeave"
      :handleStepDrop="handleStepDrop"
      :handleDragEnd="handleDragEnd"
    />
    <!-- Help Text ausgelagert -->
    <RhythmSequencerHelp />
  </div>
</template>
