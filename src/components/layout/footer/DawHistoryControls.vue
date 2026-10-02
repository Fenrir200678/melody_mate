<template>
  <div class="bg-daw-surface rounded-chip border-daw-border flex items-center border p-0.5">
    <DawIconButton
      :icon="Undo2"
      size="xs"
      appearance="ghost"
      :disabled="!activeHistoryStore.canUndo"
      title="Undo (Ctrl+Z)"
      aria-label="Undo"
      @click="activeHistoryStore.undo()"
    />

    <DawIconButton
      :icon="Redo2"
      size="xs"
      appearance="ghost"
      :disabled="!activeHistoryStore.canRedo"
      title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
      aria-label="Redo"
      @click="activeHistoryStore.redo()"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Redo2, Undo2 } from '@lucide/vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import { useHarmonyStore } from '@/stores/harmony.store'
  import { useMelodyStore } from '@/stores/melody.store'
  import { useRhythmStore } from '@/stores/rhythm.store'
  import { useUiStore } from '@/stores/ui.store'

  const harmonyStore = useHarmonyStore()
  const melodyStore = useMelodyStore()
  const rhythmStore = useRhythmStore()
  const uiStore = useUiStore()

  // Undo/redo follows the piano roll's active track or rhythm context
  const activeHistoryStore = computed(() => {
    if (uiStore.activeHistoryContext === 'rhythm') return rhythmStore
    return uiStore.activeTrack === 'chords' ? harmonyStore : melodyStore
  })
</script>
