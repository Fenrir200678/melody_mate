<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useChordStore } from '@/stores/chord.store'
import { useDropZone, templateRef } from '@vueuse/core'
import Sortable from 'sortablejs'
import Button from 'primevue/button'
import DiatonicChordPalette from './DiatonicChordPalette.vue'
import ChordCard from './ChordCard.vue'
import { useToast } from 'primevue/usetoast'

const props = defineProps<{ disabled: boolean }>()

const chordStore = useChordStore()
const toast = useToast()

const currentProgression = computed(() => chordStore.currentProgression)

function removeChord(index: number) {
  chordStore.removeChordFromProgression(index)
}

function clearAllChords() {
  chordStore.clearProgression()
}

const sortableContainer = templateRef<HTMLElement>('sortableContainer')
const dropZone = templateRef<HTMLElement>('dropZone')
let sortableInstance: Sortable | null = null

onMounted(() => {
  if (sortableContainer.value) {
    sortableInstance = Sortable.create(sortableContainer.value, {
      animation: 200,
      ghostClass: 'chord-ghost',
      chosenClass: 'chord-chosen',
      dragClass: 'chord-drag',
      disabled: props.disabled,
      onEnd: (evt: any) => {
        const oldIndex = evt.oldIndex!
        const newIndex = evt.newIndex!
        if (oldIndex !== newIndex) {
          chordStore.reorderProgression(oldIndex, newIndex)
        }
      }
    })
  }
})

onUnmounted(() => {
  if (sortableInstance) {
    sortableInstance.destroy()
  }
})

// Drop zone for adding new chords from palette
const { isOverDropZone } = useDropZone(dropZone, {
  // @ts-expect-error - DropZone types
  onDrop(files, event) {
    // Handle dropped chord data
    const chordDataStr = event.dataTransfer?.getData('application/chord-data')
    if (chordDataStr) {
      try {
        const chordData = JSON.parse(chordDataStr)
        if (chordData.name && chordData.notes) {
          chordStore.addChordToProgression(chordData)
          toast.add({
            severity: 'success',
            summary: 'Chord Added',
            detail: `${chordData.name} added to progression`,
            life: 2000
          })
        }
      } catch (error) {
        console.warn('Failed to parse chord data:', error)
      }
    }
  }
})
</script>

<template>
  <div :class="{ 'opacity-50 pointer-events-none': disabled }">
    <div class="flex items-center justify-between mb-4">
      <label class="font-medium text-gray-200">Build Your Progression</label>
      <Button
        label="Clear All"
        icon="pi pi-trash"
        severity="danger"
        size="small"
        outlined
        @click="clearAllChords"
        :disabled="currentProgression.length === 0 || disabled"
      />
    </div>

    <!-- Drop Zone for Chord Progression -->
    <div
      ref="dropZone"
      class="min-h-[140px] p-6 border-2 border-dashed rounded-lg transition-all duration-300"
      :class="{
        'border-zinc-600 bg-zinc-900': !isOverDropZone,
        'border-blue-400 bg-blue-900/40': isOverDropZone,
        'border-emerald-500 bg-emerald-900/20': currentProgression.length > 0 && !isOverDropZone
      }"
    >
      <!-- Sortable Container -->
      <div v-if="currentProgression.length > 0" ref="sortableContainer" class="flex flex-wrap gap-3">
        <ChordCard
          v-for="(chord, index) in currentProgression"
          :key="`${chord.name}-${index}`"
          :chord="chord"
          :index="index"
          size="medium"
          :show-remove-button="true"
          :show-roman-numeral="true"
          :show-position-numeral="true"
          class="chord-in-progression cursor-grab"
          @remove="removeChord"
        />
      </div>

      <!-- Empty State -->
      <div v-else class="flex items-center justify-center text-zinc-500 text-sm italic py-8">
        <div class="text-center">
          <i class="pi pi-arrow-down text-3xl mb-3 block text-zinc-600"></i>
          <p class="mb-1">Your chord progression will appear here</p>
          <p class="text-xs text-zinc-600">Drag chords from below to add them</p>
        </div>
      </div>
    </div>

    <!-- Chord Palette -->
    <div class="mt-6">
      <DiatonicChordPalette :disabled="disabled" />
    </div>
  </div>
</template>
