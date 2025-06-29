<script setup lang="ts">
import { computed } from 'vue'
import RhythmSequencerStep from './RhythmSequencerStep.vue'
import { SEQUENCER_STEPS_PER_BAR } from '@/ts/consts'

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

const totalSteps = computed(() => props.groupedSteps.length * 4)
const numberOfBars = computed(() => totalSteps.value / SEQUENCER_STEPS_PER_BAR)

function getStepIndex(barIndex: number, groupIndexInBar: number, stepInGroup: number) {
  const groupsPerBar = SEQUENCER_STEPS_PER_BAR / 4
  const groupIndex = barIndex * groupsPerBar + groupIndexInBar
  return groupIndex * 4 + stepInGroup
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <label class="text-sm font-medium">Rhythm Sequence ({{ totalSteps }} steps)</label>
    <div class="bg-zinc-800 rounded-lg p-4 shadow-inner">
      <div class="flex flex-col gap-4">
        <div v-for="barIndex in numberOfBars" :key="barIndex" class="flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-zinc-400">Bar {{ barIndex }}</span>
            <div class="flex-grow h-px bg-zinc-700"></div>
          </div>
          <div class="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-2">
            <div
              v-for="(group, groupIndexInBar) in props.groupedSteps.slice(
                (barIndex - 1) * (SEQUENCER_STEPS_PER_BAR / 4),
                barIndex * (SEQUENCER_STEPS_PER_BAR / 4)
              )"
              :key="`bar-${barIndex}-group-${groupIndexInBar}`"
              class="flex flex-col gap-2 sm:flex-row sm:gap-1"
            >
              <!-- Mobile: Beat indicator -->
              <div class="flex sm:hidden items-center justify-center text-xs text-zinc-400 font-mono mb-1">
                Beat {{ groupIndexInBar + 1 }}
              </div>
              <div class="flex flex-col gap-1 sm:contents">
                <div class="flex gap-1 justify-between sm:contents">
                  <RhythmSequencerStep
                    v-for="(step, stepInGroup) in group"
                    :key="getStepIndex(barIndex - 1, groupIndexInBar, stepInGroup)"
                    :step="step"
                    :stepIndex="getStepIndex(barIndex - 1, groupIndexInBar, stepInGroup)"
                    :isDropTarget="
                      props.dropTargetIndex === getStepIndex(barIndex - 1, groupIndexInBar, stepInGroup)
                    "
                    :isDragSource="
                      props.draggedItem?.type === 'step' &&
                      props.draggedItem.stepIndex === getStepIndex(barIndex - 1, groupIndexInBar, stepInGroup)
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
    </div>
  </div>
</template>
