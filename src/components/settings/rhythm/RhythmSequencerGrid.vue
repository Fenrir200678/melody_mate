<script setup lang="ts">
import { defineProps } from 'vue'
import RhythmSequencerStep from './RhythmSequencerStep.vue'

const props = defineProps<{
  groupedSteps: number[][]
  getStepColor: (step: number, stepIndex: number) => string
  getStepLabel: (step: number) => string
  dropTargetIndex: number | null
  draggedItem: any
  handleStepClick: (index: number) => void
  handleStepDragStart: (event: DragEvent, index: number) => void
  handleStepDragOver: (event: DragEvent, index: number) => void
  handleStepDragLeave: () => void
  handleStepDrop: (event: DragEvent, index: number) => void
  handleDragEnd: () => void
}>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <label class="text-sm font-medium">Rhythm Sequence (16 steps)</label>
    <div class="bg-zinc-800 rounded-lg p-4 shadow-inner">
      <div class="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-2">
        <div
          v-for="(group, groupIndex) in props.groupedSteps"
          :key="groupIndex"
          class="flex flex-col gap-2 sm:flex-row sm:gap-1"
        >
          <!-- Mobile: Beat indicator -->
          <div class="flex sm:hidden items-center justify-center text-xs text-zinc-400 font-mono mb-1">
            Beat {{ groupIndex + 1 }}
          </div>
          <div class="flex flex-col gap-1 sm:contents">
            <div class="flex gap-1 justify-between sm:contents">
              <RhythmSequencerStep
                v-for="(step, stepInGroup) in group"
                :key="stepInGroup"
                :step="step"
                :stepIndex="groupIndex * 4 + stepInGroup"
                :isDropTarget="props.dropTargetIndex === groupIndex * 4 + stepInGroup"
                :isDragSource="
                  props.draggedItem?.type === 'step' && props.draggedItem.stepIndex === groupIndex * 4 + stepInGroup
                "
                :getStepColor="props.getStepColor"
                :getStepLabel="props.getStepLabel"
                :handleStepClick="props.handleStepClick"
                :handleStepDragStart="props.handleStepDragStart"
                :handleStepDragOver="props.handleStepDragOver"
                :handleStepDragLeave="props.handleStepDragLeave"
                :handleStepDrop="props.handleStepDrop"
                :handleDragEnd="props.handleDragEnd"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
