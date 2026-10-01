<template>
  <header class="rhythm-studio__header border-daw-border flex h-7 shrink-0 items-center justify-between border-b px-3">
    <div class="flex min-w-0 items-center gap-2">
      <AudioLines class="text-daw-pulse h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <h2 id="rhythm-studio-title" class="text-daw-text text-2xs font-bold tracking-wider uppercase">Rhythm Studio</h2>
      <span class="text-daw-pulse text-micro hidden truncate font-mono sm:inline">
        {{ activeSavedPreset?.name ?? 'Custom' }}{{ hasUnsavedChanges ? ' *' : '' }} · {{ pattern.bars }}
        {{ pattern.bars === 1 ? 'bar' : 'bars' }} · {{ pattern.events.length }} hits
      </span>
    </div>
    <div class="flex items-center gap-1">
      <DawIconButton
        :icon="Undo2"
        size="sm"
        appearance="ghost"
        :disabled="!store.canUndo"
        aria-label="Undo rhythm edit"
        title="Undo (Ctrl+Z)"
        @click="store.undo()"
      />
      <DawIconButton
        :icon="Redo2"
        size="sm"
        appearance="ghost"
        :disabled="!store.canRedo"
        aria-label="Redo rhythm edit"
        title="Redo (Ctrl+Shift+Z)"
        @click="store.redo()"
      />
      <DawButton
        size="xs"
        appearance="surface"
        variant="pulse"
        :active="store.isPreviewing"
        :disabled="!store.isPreviewing && !pattern.events.length"
        :icon="store.isPreviewing ? Square : Play"
        @click="store.isPreviewing ? store.stopPreview() : store.startPreview()"
      >
        {{ store.isPreviewing ? 'Stop preview' : 'Preview' }}
      </DawButton>
      <DawButton
        size="xs"
        appearance="primary"
        variant="signal"
        :disabled="!store.canGenerate || melodyStore.isGenerating"
        :title="store.canGenerate ? 'Generate melody from this pattern' : 'Add an onset before generating'"
        @click="void melodyStore.generate()"
      >
        Generate melody
      </DawButton>
      <DawIconButton
        :icon="X"
        size="sm"
        appearance="ghost"
        aria-label="Close Rhythm Studio"
        title="Close Rhythm Studio"
        @click="uiStore.setRhythmStudioOpen(false)"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { AudioLines, Play, Redo2, Square, Undo2, X } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import { useMelodyStore } from '@/stores/melody.store'
  import { useRhythmStore } from '@/stores/rhythm.store'
  import { useUiStore } from '@/stores/ui.store'

  const store = useRhythmStore()
  const uiStore = useUiStore()
  const melodyStore = useMelodyStore()

  const pattern = computed(() => store.pattern)
  const activeSavedPreset = computed(() => store.savedPresets.find((item) => item.id === store.activeSavedPresetId))
  const hasUnsavedChanges = computed(
    () => !!activeSavedPreset.value && JSON.stringify(activeSavedPreset.value.pattern) !== JSON.stringify(pattern.value)
  )
</script>
