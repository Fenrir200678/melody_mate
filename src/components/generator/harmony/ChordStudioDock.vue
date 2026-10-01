<template>
  <section
    id="chord-studio-dock"
    class="border-daw-border bg-daw-panel flex shrink-0 flex-col overflow-hidden border-t select-none"
    :style="{ height: `${effectiveHeight}px` }"
    aria-label="Chord Studio"
    @pointerdown="focusChordStudio"
    @focusin="focusChordStudio"
  >
    <!-- Top Resize Handle -->
    <DawResizeHandle
      :model-value="effectiveHeight"
      orientation="horizontal"
      side="bottom"
      :min="CHORD_STUDIO_MIN_HEIGHT"
      :max="maxDockHeight"
      :default-value="CHORD_STUDIO_DEFAULT_HEIGHT"
      label="Resize Chord Studio"
      @update:model-value="uiStore.setChordStudioHeight"
    />

    <!-- Dock Header -->
    <div class="border-daw-border bg-daw-panel flex shrink-0 items-center justify-between border-b px-3 py-1.5">
      <div class="flex items-center gap-2.5">
        <div class="flex items-center gap-2">
          <Music2 class="text-daw-chord h-3.5 w-3.5" aria-hidden="true" />
          <h2 class="text-daw-text text-2xs font-bold tracking-wider uppercase">Chord Studio</h2>
          <span
            class="rounded-chip bg-daw-surface text-daw-chord border-daw-border text-micro py-0.2 border px-1.5 font-mono"
          >
            {{ projectStore.key }} {{ projectStore.scale }}
          </span>
        </div>

        <div class="bg-daw-border hidden h-3 w-px sm:block" />

        <!-- Progression Presets Selector with Steppers and Dice -->
        <ChordProgressionSelector />
      </div>

      <div class="flex items-center gap-2">
        <span class="text-daw-text-muted text-micro hidden font-mono md:inline">
          1/3 Diatonic Palette · 2/3 Progression Timeline
        </span>

        <DawIconButton
          :icon="X"
          size="sm"
          appearance="ghost"
          title="Close Chord Studio (C)"
          aria-label="Close Chord Studio"
          @click="uiStore.setChordStudioOpen(false)"
        />
      </div>
    </div>

    <!-- Dock Body: 1/3 Palette, 2/3 Timeline -->
    <div class="divide-daw-border flex min-h-0 flex-1 divide-x overflow-hidden">
      <!-- Left Column: Diatonic Palette (1/3) -->
      <div class="bg-daw-panel w-1/3 max-w-100 min-w-75 shrink-0 overflow-hidden">
        <ChordStudioPalette v-model:chord-mode="chordMode" v-model:selected-degree="selectedPaletteDegree" />
      </div>

      <!-- Right Column: Progression Timeline (2/3) -->
      <div class="bg-daw-bg flex min-w-0 flex-1 overflow-hidden">
        <ChordStudioTimeline :chord-mode="chordMode" :palette-degree="selectedPaletteDegree" class="w-full" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { Music2, X } from '@lucide/vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import DawResizeHandle from '@/components/common/DawResizeHandle.vue'
  import ChordProgressionSelector from './ChordProgressionSelector.vue'
  import ChordStudioPalette from './ChordStudioPalette.vue'
  import ChordStudioTimeline from './ChordStudioTimeline.vue'
  import { useProjectStore } from '@/stores/project.store'
  import type { ChordMode } from '@/core/theory/chord.engine'
  import { DEFAULT_CHORD_PALETTE } from '@/config/ui-defaults'
  import {
    CHORD_STUDIO_DEFAULT_HEIGHT,
    CHORD_STUDIO_MAX_HEIGHT,
    CHORD_STUDIO_MIN_HEIGHT,
    useUiStore
  } from '@/stores/ui.store'

  const uiStore = useUiStore()
  const projectStore = useProjectStore()
  const chordMode = ref<ChordMode>(DEFAULT_CHORD_PALETTE.mode)
  const selectedPaletteDegree = ref<number | null>(DEFAULT_CHORD_PALETTE.selectedDegree)

  function focusChordStudio(): void {
    uiStore.setActiveTrack('chords')
    uiStore.setActiveHistoryContext('chord')
  }

  const maxDockHeight = ref(CHORD_STUDIO_MAX_HEIGHT)
  const effectiveHeight = computed(() =>
    Math.max(CHORD_STUDIO_MIN_HEIGHT, Math.min(uiStore.chordStudioHeight, maxDockHeight.value))
  )

  const MIN_PIANO_ROLL_HEIGHT = 280

  function updateMaxDockHeight(): void {
    if (typeof window === 'undefined') return
    const shell = document.querySelector('.daw-shell')
    const header = document.querySelector('.daw-header')
    const footer = document.querySelector('.daw-footer')
    const available =
      shell && header && footer
        ? shell.clientHeight - header.clientHeight - footer.clientHeight - MIN_PIANO_ROLL_HEIGHT
        : CHORD_STUDIO_MAX_HEIGHT
    maxDockHeight.value = Math.max(CHORD_STUDIO_MIN_HEIGHT, Math.min(CHORD_STUDIO_MAX_HEIGHT, available))
  }

  onMounted(() => {
    updateMaxDockHeight()
    window.addEventListener('resize', updateMaxDockHeight)
  })
  onUnmounted(() => window.removeEventListener('resize', updateMaxDockHeight))
</script>
