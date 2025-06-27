<script setup lang="ts">
import { defineProps } from 'vue'

const props = defineProps<{
  noteValues: Array<any>
  selectedNoteValue: any
  selectNoteValue: (noteValue: any) => void
  handlePaletteDragStart: (event: DragEvent, noteValue: any) => void
  handleDragEnd: (event: DragEvent) => void
}>()
</script>

<template>
  <div class="flex flex-col gap-3">
    <label class="text-sm font-medium">Note Values</label>
    <div class="flex gap-3 flex-wrap">
      <div
        v-for="noteValue in props.noteValues"
        :key="noteValue.name"
        :class="[
          'group relative px-4 py-3 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-200 border-2 shadow-sm',
          props.selectedNoteValue.duration === noteValue.duration
            ? `${noteValue.color} border-white text-white shadow-lg scale-105`
            : `bg-zinc-700 border-zinc-600 text-zinc-300 hover:bg-zinc-600 hover:border-zinc-500 hover:scale-102`
        ]"
        draggable="true"
        @dragstart="(event) => props.handlePaletteDragStart(event, noteValue)"
        @dragend="props.handleDragEnd"
        @click="() => props.selectNoteValue(noteValue)"
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
</template>
