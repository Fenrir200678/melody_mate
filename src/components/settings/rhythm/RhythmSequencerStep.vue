<script setup lang="ts">
import { defineProps } from 'vue'

const props = defineProps<{
  step: number
  stepIndex: number
  isDropTarget: boolean
  isDragSource: boolean
  getStepColor: (step: number, stepIndex: number) => string
  getStepLabel: (step: number) => string
  handleStepClick: (index: number) => void
  handleStepDragStart: (event: DragEvent, index: number) => void
  handleStepDragOver: (event: DragEvent, index: number) => void
  handleStepDragLeave: () => void
  handleStepDrop: (event: DragEvent, index: number) => void
  handleDragEnd: () => void
}>()
</script>

<template>
  <div class="relative flex flex-col items-center gap-1">
    <!-- Step box -->
    <div
      :class="[
        'relative flex items-center justify-center rounded-lg cursor-pointer border-2 transition-all duration-200 shadow-sm',
        'w-12 h-12 sm:w-10 sm:h-10 lg:w-12 lg:h-12',
        props.getStepColor(props.step, props.stepIndex),
        props.step > 0 && props.step !== -1 ? 'cursor-grab active:cursor-grabbing' : ''
      ]"
      :draggable="props.step > 0 && props.step !== -1"
      @click="() => props.handleStepClick(props.stepIndex)"
      @dragstart="(event) => props.handleStepDragStart(event, props.stepIndex)"
      @dragover="(event) => props.handleStepDragOver(event, props.stepIndex)"
      @dragleave="props.handleStepDragLeave"
      @drop="(event) => props.handleStepDrop(event, props.stepIndex)"
      @dragend="props.handleDragEnd"
    >
      <span class="text-xs font-bold text-white/90 pointer-events-none select-none">
        {{ props.getStepLabel(props.step) }}
      </span>
      <!-- Drag handle for active steps -->
      <div
        v-if="props.step > 0 && props.step !== -1"
        class="absolute top-0.5 right-0.5 opacity-0 hover:opacity-100 transition-opacity"
      >
        <i class="pi pi-arrows-alt text-xs text-white/60"></i>
      </div>
    </div>
    <!-- Step number (direkt darunter) -->
    <div class="text-xs text-zinc-500 font-mono">
      {{ (props.stepIndex + 1).toString().padStart(2, '0') }}
    </div>
  </div>
</template>
