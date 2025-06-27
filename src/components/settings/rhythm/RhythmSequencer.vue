<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRhythmSelection } from '@/composables/useRhythmSelection'
import { NOTE_DURATIONS } from '@/ts/consts'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'

const { customRhythmSequence, useCustomRhythm, setStepDuration, clearCustomRhythm, toggleCustomRhythm } =
  useRhythmSelection()

// Available note values for the palette
const noteValues = [
  { name: '1/16', duration: NOTE_DURATIONS.SIXTEENTH, color: 'bg-blue-500', hoverColor: 'hover:bg-blue-400' },
  { name: '1/8', duration: NOTE_DURATIONS.EIGHTH, color: 'bg-green-500', hoverColor: 'hover:bg-green-400' },
  { name: '1/4', duration: NOTE_DURATIONS.QUARTER, color: 'bg-yellow-500', hoverColor: 'hover:bg-yellow-400' },
  { name: '1/2', duration: NOTE_DURATIONS.HALF, color: 'bg-orange-500', hoverColor: 'hover:bg-orange-400' },
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
</script>

<template>
  <div class="flex flex-col gap-6 w-full">
    <!-- Header Controls -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-4">
        <label for="useCustomRhythm" class="text-sm font-medium">Custom Rhythm</label>
        <ToggleSwitch
          v-model="useCustomRhythm"
          inputId="useCustomRhythm"
          @update:modelValue="handleToggleCustomRhythm"
          class="align-middle"
        />
      </div>

      <div class="flex items-center gap-3 sm:gap-2">
        <!-- Trash Zone -->
        <div
          class="flex items-center justify-center w-10 h-10 rounded-lg border-2 border-dashed border-red-400 text-red-400 hover:bg-red-400/10 transition-colors"
          @dragover="handleTrashDragOver"
          @drop="handleTrashDrop"
          title="Drag notes here to delete"
        >
          <i class="pi pi-trash text-sm"></i>
        </div>

        <Button
          label="Clear All"
          icon="pi pi-replay"
          class="p-button-text p-button-sm"
          @click="handleClearCustomRhythm"
        />
      </div>
    </div>

    <!-- Note Value Palette -->
    <div class="flex flex-col gap-3">
      <label class="text-sm font-medium">Note Values</label>
      <div class="flex gap-3 flex-wrap">
        <div
          v-for="noteValue in noteValues"
          :key="noteValue.name"
          :class="[
            'group relative px-4 py-3 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-200 border-2 shadow-sm',
            selectedNoteValue.duration === noteValue.duration
              ? `${noteValue.color} border-white text-white shadow-lg scale-105`
              : `bg-zinc-700 border-zinc-600 text-zinc-300 hover:bg-zinc-600 hover:border-zinc-500 hover:scale-102`
          ]"
          draggable="true"
          @dragstart="handlePaletteDragStart($event, noteValue)"
          @dragend="handleDragEnd"
          @click="selectNoteValue(noteValue)"
        >
          <div class="flex flex-col items-center gap-1">
            <span class="text-sm font-bold">{{ noteValue.name }}</span>
            <div class="text-xs opacity-75">Note</div>
          </div>

          <!-- Drag indicator -->
          <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <i class="pi pi-arrows-alt text-xs"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Sequencer Grid -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium">Rhythm Sequence (16 steps)</label>
      <div class="bg-zinc-800 rounded-lg p-4 shadow-inner">
        <!-- Responsive grid: Mobile stacked, Tablet/Desktop with wrap -->
        <div class="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-2">
          <!-- Mobile: Group by 4 beats, Tablet+: Individual beats that can wrap -->
          <div
            v-for="(group, groupIndex) in groupedSteps"
            :key="groupIndex"
            class="flex flex-col gap-2 sm:flex-row sm:gap-1"
          >
            <!-- Beat indicator (only on mobile) -->
            <div class="flex sm:hidden items-center justify-center text-xs text-zinc-400 font-mono mb-1">
              Beat {{ groupIndex + 1 }}
            </div>

            <!-- Steps and numbers container -->
            <div class="flex flex-col gap-1 sm:contents">
              <!-- Steps in this beat -->
              <div class="flex gap-1 justify-between sm:contents">
                <div
                  v-for="(step, stepInGroup) in group"
                  :key="stepInGroup"
                  class="relative flex flex-col items-center gap-1"
                >
                  <!-- Step box -->
                  <div
                    :class="[
                      'relative flex items-center justify-center rounded-lg cursor-pointer border-2 transition-all duration-200 shadow-sm',
                      'w-12 h-12 sm:w-10 sm:h-10 lg:w-12 lg:h-12',
                      getStepColor(step, groupIndex * 4 + stepInGroup),
                      step > 0 && step !== -1 ? 'cursor-grab active:cursor-grabbing' : ''
                    ]"
                    :draggable="step > 0 && step !== -1"
                    @click="handleStepClick(groupIndex * 4 + stepInGroup)"
                    @dragstart="handleStepDragStart($event, groupIndex * 4 + stepInGroup)"
                    @dragover="handleStepDragOver($event, groupIndex * 4 + stepInGroup)"
                    @dragleave="handleStepDragLeave"
                    @drop="handleStepDrop($event, groupIndex * 4 + stepInGroup)"
                    @dragend="handleDragEnd"
                  >
                    <span class="text-xs font-bold text-white/90 pointer-events-none select-none">
                      {{ getStepLabel(step) }}
                    </span>

                    <!-- Beat separator line (large desktop only) -->
                    <div
                      v-if="stepInGroup === 3 && groupIndex < 3"
                      class="hidden xl:block absolute -right-2 top-1/2 transform -translate-y-1/2 w-0.5 h-6 bg-zinc-600"
                    ></div>

                    <!-- Drag handle for active steps -->
                    <div
                      v-if="step > 0 && step !== -1"
                      class="absolute top-0.5 right-0.5 opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <i class="pi pi-arrows-alt text-xs text-white/60"></i>
                    </div>
                  </div>

                  <!-- Step number (directly below each step) -->
                  <div class="text-xs text-zinc-500 font-mono">
                    {{ (groupIndex * 4 + stepInGroup + 1).toString().padStart(2, '0') }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Help Text -->
    <div class="text-xs text-zinc-400 bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
      <div class="flex items-start gap-2">
        <i class="pi pi-info-circle text-sm text-blue-400 mt-0.5 flex-shrink-0"></i>
        <div class="space-y-1">
          <p>
            <strong>Drag & Drop:</strong> Drag note values from the palette to the grid, or move notes within the grid.
          </p>
          <p><strong>Click:</strong> Select a note value and click on grid steps to place notes.</p>
          <p><strong>Delete:</strong> Drag notes to the trash icon or click on placed notes to remove them.</p>
        </div>
      </div>
    </div>
  </div>
</template>
