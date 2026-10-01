<template>
  <div
    class="border-daw-border bg-daw-panel flex min-w-0 shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2"
    role="group"
    aria-label="Generation work range"
    title="Drag empty space outside the target to draw it, inside to move it, or at either edge to resize it by steps. Click outside to target the entire project. Cmd or Ctrl + drag selects notes."
  >
    <span class="text-micro text-daw-text-muted shrink-0 font-semibold">Target</span>
    <span class="text-daw-text text-2xs min-w-0 truncate font-mono" :title="rangeLabel">{{ rangeLabel }}</span>

    <div class="flex items-center gap-2">
      <label for="work-range-start" class="text-micro text-daw-text-muted">Start step</label>
      <input
        id="work-range-start"
        type="number"
        inputmode="numeric"
        class="bg-daw-surface border-daw-border text-daw-text rounded-control focus:border-daw-signal text-2xs focus-visible:ring-daw-signal h-6 w-14 border px-2 font-mono focus:outline-none focus-visible:ring-1"
        :min="1"
        :max="maxSteps"
        :value="projectStore.workRange.startStep + 1"
        aria-describedby="work-range-position-help"
        @change="setStartStep"
      />
      <label for="work-range-end" class="text-micro text-daw-text-muted">End step</label>
      <input
        id="work-range-end"
        type="number"
        inputmode="numeric"
        class="bg-daw-surface border-daw-border text-daw-text rounded-control focus:border-daw-signal text-2xs focus-visible:ring-daw-signal h-6 w-14 border px-2 font-mono focus:outline-none focus-visible:ring-1"
        :min="projectStore.workRange.startStep + 1"
        :max="maxSteps"
        :value="projectStore.workRange.endStep"
        aria-describedby="work-range-position-help"
        @change="setEndStep"
      />
      <span id="work-range-position-help" class="sr-only">Positions are one-based and include both endpoints.</span>
    </div>

    <div class="ml-auto flex items-center gap-1">
      <DawButton
        size="sm"
        appearance="ghost"
        title="Target the entire project"
        @click="projectStore.selectEntireProject()"
      >
        All
      </DawButton>
      <DawButton
        size="sm"
        appearance="ghost"
        title="Set target to the current loop"
        @click="projectStore.useLoopAsWorkRange()"
      >
        Use loop
      </DawButton>
      <DawButton size="sm" appearance="ghost" title="Set the loop to the current target" @click="loopTarget">
        Loop target
      </DawButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import DawButton from '@/components/common/DawButton.vue'
  import { STEPS_PER_BAR } from '@/core/schemas/project.schema'
  import { useAudioStore } from '@/stores/audio.store'
  import { useProjectStore } from '@/stores/project.store'
  import { formatWorkRangeLabel } from '@/utils/work-range-label'

  const projectStore = useProjectStore()
  const audioStore = useAudioStore()
  const maxSteps = computed(() => projectStore.bars * STEPS_PER_BAR)
  const rangeLabel = computed(() => formatWorkRangeLabel(projectStore.workRange))

  function setStartStep(event: Event): void {
    const input = event.target as HTMLInputElement
    if (!Number.isFinite(input.valueAsNumber)) {
      input.value = String(projectStore.workRange.startStep + 1)
      return
    }
    const startStep = Math.max(1, Math.min(maxSteps.value, Math.round(input.valueAsNumber)))
    const endStep = Math.max(projectStore.workRange.endStep, startStep)
    projectStore.setWorkRange({ startStep: startStep - 1, endStep: Math.min(maxSteps.value, endStep) })
  }

  function setEndStep(event: Event): void {
    const input = event.target as HTMLInputElement
    if (!Number.isFinite(input.valueAsNumber)) {
      input.value = String(projectStore.workRange.endStep)
      return
    }
    const endStep = Math.max(
      projectStore.workRange.startStep + 1,
      Math.min(maxSteps.value, Math.round(input.valueAsNumber))
    )
    projectStore.setWorkRange({ startStep: projectStore.workRange.startStep, endStep })
  }

  function loopTarget(): void {
    projectStore.loopWorkRange()
    audioStore.applyLoop()
  }
</script>
