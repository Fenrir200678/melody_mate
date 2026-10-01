<template>
  <div class="border-daw-border bg-daw-panel flex shrink-0 items-center justify-between gap-2 border-t px-2 py-1.5">
    <div class="flex min-w-0 items-center gap-2 overflow-x-auto">
      <span class="text-daw-text-muted text-micro shrink-0 font-medium tracking-wider uppercase">Harmony</span>

      <template v-if="activeChords.length > 0">
        <div
          v-for="chord in activeChords"
          :key="chord.id"
          class="border-daw-border bg-daw-surface rounded-chip text-micro flex shrink-0 items-center gap-1.5 border px-1.5 py-0.5 font-mono"
        >
          <span class="text-daw-chord font-bold">{{ chord.name }}</span>
          <span v-if="chord.roman" class="text-daw-text-muted text-2xs">({{ chord.roman }})</span>
          <span class="text-daw-text-muted text-micro">
            {{ chord.notes.join('·') }}
          </span>
        </div>
      </template>

      <div v-else class="text-daw-text-muted text-micro flex items-center gap-1.5 font-mono">
        <span class="bg-daw-surface rounded-chip border-daw-border border px-1.5 py-0.5">
          Diatonic Triads · {{ projectStore.key }} {{ projectStore.scale }}
        </span>
      </div>
    </div>

    <DawButton
      size="xs"
      appearance="ghost"
      variant="chord"
      title="Open Chord Studio (C)"
      @click="uiStore.setChordStudioOpen(true)"
    >
      Chord Studio
    </DawButton>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import DawButton from '@/components/common/DawButton.vue'
  import { STEPS_PER_BAR } from '@/core/schemas/project.schema'
  import { useHarmonyStore } from '@/stores/harmony.store'
  import { useProjectStore } from '@/stores/project.store'
  import { useUiStore } from '@/stores/ui.store'

  const harmonyStore = useHarmonyStore()
  const projectStore = useProjectStore()
  const uiStore = useUiStore()

  const activeChords = computed(() => {
    if (!harmonyStore.useChords || harmonyStore.chords.length === 0) return []
    const startBar = Math.floor(projectStore.workRange.startStep / STEPS_PER_BAR)
    const endBar = Math.ceil(projectStore.workRange.endStep / STEPS_PER_BAR)

    return harmonyStore.chords.filter((c) => c.startBar < endBar && c.startBar + c.durationBars > startBar)
  })
</script>
