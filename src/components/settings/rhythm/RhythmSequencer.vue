<script setup lang="ts">
import { ref } from 'vue'
import { useRhythmSelection } from '@/composables/useRhythmSelection'
import { NOTE_DURATIONS } from '@/ts/consts'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'

const { customRhythmSequence, useCustomRhythm, setStepDuration, clearCustomRhythm, toggleCustomRhythm } =
  useRhythmSelection()

// Available note values for the palette
const noteValues = [
  { name: '1/16', duration: NOTE_DURATIONS.SIXTEENTH, color: 'bg-blue-500' },
  { name: '1/8', duration: NOTE_DURATIONS.EIGHTH, color: 'bg-green-500' },
  { name: '1/4', duration: NOTE_DURATIONS.QUARTER, color: 'bg-yellow-500' },
  { name: '1/2', duration: NOTE_DURATIONS.HALF, color: 'bg-orange-500' },
  { name: '1/1', duration: NOTE_DURATIONS.WHOLE, color: 'bg-red-500' }
]

// Currently selected note value
const selectedNoteValue = ref(noteValues[0]) // Default to 16th note

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

function getStepColor(step: number) {
  if (step === 0) return 'bg-zinc-700 border-zinc-600 hover:bg-zinc-600' // rest
  if (step === -1) return 'bg-zinc-400/40 border-zinc-300 cursor-not-allowed' // occupied

  // Find matching note value color
  const noteValue = noteValues.find((nv) => nv.duration === step)
  return noteValue ? `${noteValue.color} border-opacity-70` : 'bg-primary-500 border-primary-700'
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
</script>

<template>
  <div class="flex flex-col gap-4 w-full">
    <!-- Header Controls -->
    <div class="flex items-center gap-4">
      <label for="useCustomRhythm" class="text-sm font-medium">Custom Rhythm</label>
      <ToggleSwitch
        v-model="useCustomRhythm"
        inputId="useCustomRhythm"
        @update:modelValue="handleToggleCustomRhythm"
        class="align-middle"
      />
      <Button
        label="Clear"
        icon="pi pi-replay"
        class="p-button-text p-button-sm ml-2"
        @click="handleClearCustomRhythm"
      />
    </div>

    <!-- Note Value Palette -->
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium">Notenwert auswählen:</label>
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="noteValue in noteValues"
          :key="noteValue.name"
          :class="[
            'px-3 py-2 rounded text-sm font-medium transition border',
            selectedNoteValue.duration === noteValue.duration
              ? `${noteValue.color} border-white text-white`
              : `bg-zinc-700 border-zinc-600 text-zinc-300 hover:bg-zinc-600`
          ]"
          @click="selectNoteValue(noteValue)"
        >
          {{ noteValue.name }}
        </button>
      </div>
    </div>

    <!-- Sequencer Grid -->
    <div class="grid grid-cols-16 gap-1 bg-zinc-800 rounded-md p-2 w-full max-w-full overflow-x-auto">
      <div
        v-for="(step, idx) in customRhythmSequence"
        :key="idx"
        :class="[
          'aspect-square w-6 md:w-8 rounded cursor-pointer border transition relative flex items-center justify-center',
          getStepColor(step)
        ]"
        @click="handleStepClick(idx)"
      >
        <span class="text-xs font-bold text-white/90 pointer-events-none">
          {{ getStepLabel(step) }}
        </span>
      </div>
    </div>

    <!-- Help Text -->
    <div class="text-xs text-zinc-400 mt-1">
      <span>
        Wähle einen Notenwert aus und klicke auf das Grid. Felder mit längeren Noten zeigen den Notenwert an. Bereits
        gesetzte Noten können durch erneutes Klicken entfernt werden.
      </span>
    </div>
  </div>
</template>
