<template>
  <aside
    class="bg-daw-panel border-daw-border font-ui text-daw-text flex h-full flex-col overflow-y-auto border-r select-none"
    @pointerdown="uiStore.setActiveTrack('chords')"
  >
    <!-- Header -->
    <div class="border-daw-border bg-daw-panel sticky top-0 z-10 flex items-center justify-between border-b px-3 py-2">
      <div class="flex items-center gap-2">
        <Music2 class="text-daw-chord h-3.5 w-3.5" />
        <h2 tabindex="-1" class="text-daw-text text-2xs font-bold tracking-wide uppercase">Harmony &amp; Chords</h2>
      </div>

      <div class="text-daw-text-muted text-micro flex items-center gap-1 font-mono">
        <span>{{ projectStore.key }}</span>
        <span>{{ projectStore.scale }}</span>
      </div>
    </div>

    <!-- Panel Content: Streamlined Sidebar -->
    <div class="flex flex-col gap-2 p-2">
      <!-- Chord Studio Launcher Card -->
      <div class="bg-daw-surface border-daw-border rounded-panel flex flex-col gap-2 border p-2.5 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span
              class="h-2 w-2 rounded-full transition-colors"
              :class="
                uiStore.isChordStudioOpen
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                  : 'bg-daw-text-muted/40'
              "
            />
            <span class="text-daw-text text-xs font-semibold">Chord Studio</span>
          </div>

          <span class="text-daw-chord text-micro font-mono"> {{ harmonyStore.chords.length }} Chords </span>
        </div>

        <p class="text-daw-text-muted text-micro leading-snug">
          Full horizontal chord arranger and diatonic palette dock beneath the piano roll.
        </p>

        <!-- Toggle Button -->
        <DawButton
          block
          align="center"
          size="md"
          appearance="panel"
          variant="chord"
          :active="uiStore.isChordStudioOpen"
          :icon="!uiStore.isChordStudioOpen ? PanelBottomOpen : PanelBottomClose"
          @click="uiStore.toggleChordStudio()"
        >
          {{ uiStore.isChordStudioOpen ? 'Close Chord Studio' : 'Open Chord Studio (C)' }}
        </DawButton>
      </div>

      <!-- Presets Module (Quick inspiration) -->
      <ProgressionPresetsModule />

      <!-- Register & Octave Module -->
      <ChordRegisterModule />
    </div>
  </aside>
</template>

<script setup lang="ts">
  import { Music2, PanelBottomClose, PanelBottomOpen } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import ChordRegisterModule from '@/components/generator/harmony/ChordRegisterModule.vue'
  import ProgressionPresetsModule from '@/components/generator/harmony/ProgressionPresetsModule.vue'
  import { useHarmonyStore } from '@/stores/harmony.store'
  import { useProjectStore } from '@/stores/project.store'
  import { useUiStore } from '@/stores/ui.store'

  const harmonyStore = useHarmonyStore()
  const projectStore = useProjectStore()
  const uiStore = useUiStore()
</script>
