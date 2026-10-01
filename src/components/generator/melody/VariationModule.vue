<template>
  <DawModule v-model="isOpen" data-module-key="variation" title="Variation" role-dot="signal">
    <template #actions>
      <div class="flex items-center gap-1" @click.stop @keydown.stop>
        <DawIconButton
          :icon="Undo2"
          size="xs"
          appearance="ghost"
          :disabled="!melodyStore.canUndo"
          aria-label="Undo melody edit"
          title="Undo melody edit"
          disabled-reason="No melody edit to undo"
          @click="melodyStore.undo()"
        />
        <DawIconButton
          :icon="Redo2"
          size="xs"
          appearance="ghost"
          :disabled="!melodyStore.canRedo"
          aria-label="Redo melody edit"
          title="Redo melody edit"
          disabled-reason="No melody edit to redo"
          @click="melodyStore.redo()"
        />
      </div>
    </template>

    <DawSegmented
      v-model="melodyStore.variationMode"
      :options="variationModeOptions"
      size="sm"
      grow
      aria-label="Variation mode"
    />

    <template v-if="melodyStore.variationMode === 'mutate'">
      <div class="flex items-center gap-3">
        <DawKnob
          v-model="strengthPercent"
          label="Strength"
          size="sm"
          :min="0"
          :max="100"
          :step="5"
          :default-value="25"
          unit="%"
          title="Mutation strength: how intensely notes are transformed along active axes"
        />
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <span class="text-micro text-daw-text-muted">Axes</span>
          <div class="grid grid-cols-2 gap-1">
            <DawToggle
              v-for="axis in mutationAxisOptions"
              :key="axis.value"
              :model-value="melodyStore.mutationAxes[axis.value]"
              :label="axis.label"
              appearance="button"
              size="xs"
              variant="signal"
              :title="axis.title"
              @update:model-value="(value) => setAxis(axis.value, value)"
            />
          </div>
        </div>
      </div>
      <DawButton
        block
        align="center"
        size="md"
        appearance="primary"
        variant="signal"
        :disabled="!hasAxis || !workRangeNoteCount || safetyBlocked"
        :title="varyDisabledReason"
        @click="melodyStore.mutateCurrent(melodyStore.mutationAxes, melodyStore.mutationStrength)"
      >
        Vary
      </DawButton>
    </template>

    <div v-else class="grid grid-cols-2 gap-1" aria-label="Transform operations">
      <DawButton
        v-for="op in availableTransforms"
        :key="op.value"
        block
        align="center"
        size="md"
        appearance="panel"
        variant="signal"
        :disabled="Boolean(op.disabledReason)"
        :title="op.disabledReason ? `${op.description}\n${op.disabledReason}` : op.description"
        @click="melodyStore.transformCurrent(op.value)"
      >
        {{ op.label }}
      </DawButton>
    </div>

    <div class="flex flex-col gap-1">
      <DawToggle
        v-model="melodyStore.keepOriginalAsTake"
        label="Keep original as take"
        appearance="checkbox"
        size="xs"
        variant="signal"
        title="Keep original as take: automatically saves current melody in Takes rack before applying changes"
      />
      <p class="text-micro text-daw-text-muted">Applies to work range ({{ workRangeNoteCount }} notes)</p>
      <p v-if="safetyBlocked" class="text-micro text-daw-text-muted" role="status">
        Take rack is full. Free a slot or turn off keeping originals.
      </p>
    </div>
  </DawModule>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Redo2, Undo2 } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import DawKnob from '@/components/common/DawKnob.vue'
  import DawModule from '@/components/common/DawModule.vue'
  import DawSegmented from '@/components/common/DawSegmented.vue'
  import DawToggle from '@/components/common/DawToggle.vue'
  import { useModuleOpenState } from '@/composables/useModuleOpenState'
  import type { MutationAxes } from '@/core/variation'
  import { notesInWorkRange } from '@/core/generator/work-range'
  import { useMelodyStore } from '@/stores/melody.store'
  import { useProjectStore } from '@/stores/project.store'
  import { useTakesStore } from '@/stores/takes.store'
  import { mutationAxisOptions, transformOptions, variationModeOptions } from '@/utils/variation-options'

  const melodyStore = useMelodyStore()
  const projectStore = useProjectStore()
  const takesStore = useTakesStore()
  const isOpen = useModuleOpenState('variation')
  const safetyBlocked = computed(() => melodyStore.keepOriginalAsTake && takesStore.isFull)
  const hasAxis = computed(() => Object.values(melodyStore.mutationAxes).some(Boolean))
  const workRangeNoteCount = computed(() => notesInWorkRange(melodyStore.notes, projectStore.workRange).source.length)
  const transformDisabledReason = computed(() =>
    !melodyStore.notes.length
      ? 'Add or generate notes to transform'
      : safetyBlocked.value
        ? 'Free a take slot or turn off keeping originals'
        : undefined
  )
  const availableTransforms = computed(() =>
    transformOptions.map((op) => ({
      ...op,
      disabledReason: transformDisabledReason.value ?? melodyStore.getTransformDisabledReason(op.value)
    }))
  )
  const varyDisabledReason = computed(() =>
    !workRangeNoteCount.value
      ? 'Add or generate notes in the work range to vary'
      : !hasAxis.value
        ? 'Enable at least one axis'
        : safetyBlocked.value
          ? 'Free a take slot or turn off keeping originals'
          : undefined
  )
  const strengthPercent = computed({
    get: () => Math.round(melodyStore.mutationStrength * 100),
    set: (value: number) => {
      melodyStore.mutationStrength = value / 100
    }
  })

  function setAxis(axis: keyof MutationAxes, value: boolean): void {
    melodyStore.mutationAxes = { ...melodyStore.mutationAxes, [axis]: value }
  }
</script>
