<template>
  <header class="roll-toolbar select-none">
    <!-- Left Group: Editing & Creation (Track, Tools, Grid) -->
    <div class="roll-toolbar-primary flex shrink-0 items-center gap-1.5 sm:gap-2 xl:gap-3">
      <!-- Track Selector (Melody / Chords) -->
      <div
        class="rounded-chip bg-daw-panel border-daw-border inline-flex shrink-0 items-center border p-0.5"
        role="group"
        aria-label="Active Track"
      >
        <span class="roll-toolbar-track-label text-daw-text-muted mr-1.5 ml-2 font-mono text-xs">Track:</span>
        <DawButton
          size="xs"
          appearance="ghost"
          variant="signal"
          :active="activeTrack === 'melody'"
          title="Edit Melody Track (Tab)"
          aria-label="Edit Melody Track"
          @click="activeTrack = 'melody'"
        >
          <span class="roll-toolbar-track-name-full">Melody</span>
          <span class="roll-toolbar-track-name-short">Mel</span>
        </DawButton>

        <DawButton
          size="xs"
          appearance="ghost"
          variant="chord"
          :active="activeTrack === 'chords'"
          title="Edit Chord Track (Tab)"
          aria-label="Edit Chord Track"
          @click="activeTrack = 'chords'"
        >
          <span class="roll-toolbar-track-name-full">Chords</span>
          <span class="roll-toolbar-track-name-short">Chd</span>
        </DawButton>
      </div>

      <div class="roll-toolbar-divider bg-daw-border h-4 w-px shrink-0" />

      <!-- Smart Tools Group -->
      <div class="tool-group flex shrink-0 items-center gap-0.5 sm:gap-1" role="toolbar" aria-label="Editing Tools">
        <DawButton
          :icon="MousePointer"
          appearance="ghost"
          variant="signal"
          size="sm"
          :active="activeTool === 'select'"
          class="tool-btn"
          title="Select Tool (Work range / Resize / Move; Cmd/Ctrl + drag selects notes) [1]"
          aria-label="Select Tool"
          @click="activeTool = 'select'"
        >
          <span class="roll-toolbar-tool-label">Select</span>
        </DawButton>

        <DawButton
          :icon="LassoSelect"
          appearance="ghost"
          variant="signal"
          size="sm"
          :active="activeTool === 'lasso'"
          class="tool-btn"
          title="Lasso Tool (Drag a Box to Select Notes) [5]"
          aria-label="Lasso Tool"
          @click="activeTool = 'lasso'"
        >
          <span class="roll-toolbar-tool-label">Lasso</span>
        </DawButton>

        <DawButton
          :icon="Pencil"
          appearance="ghost"
          variant="signal"
          size="sm"
          :active="activeTool === 'pencil'"
          class="tool-btn"
          title="Pencil Tool (Draw Notes) [2]"
          aria-label="Pencil Tool"
          @click="activeTool = 'pencil'"
        >
          <span class="roll-toolbar-tool-label">Pencil</span>
        </DawButton>

        <DawButton
          :icon="Eraser"
          appearance="ghost"
          variant="signal"
          size="sm"
          :active="activeTool === 'eraser'"
          class="tool-btn"
          title="Eraser Tool (Delete Notes) [3]"
          aria-label="Eraser Tool"
          @click="activeTool = 'eraser'"
        >
          <span class="roll-toolbar-tool-label">Eraser</span>
        </DawButton>

        <DawButton
          :icon="Hand"
          appearance="ghost"
          variant="signal"
          size="sm"
          :active="activeTool === 'pan'"
          class="tool-btn"
          title="Hand Tool (Pan / Scroll Viewport) [4 / H]"
          aria-label="Hand Tool"
          @click="activeTool = 'pan'"
        >
          <span class="roll-toolbar-tool-label">Hand</span>
        </DawButton>
      </div>

      <div class="roll-toolbar-divider bg-daw-border h-4 w-px shrink-0" />

      <!-- Grid Snapping -->
      <div class="roll-toolbar-grid flex shrink-0 items-center gap-1 sm:gap-1.5">
        <label for="snap-grid-select" class="roll-toolbar-grid-label text-daw-text-muted font-mono text-xs"
          >Grid:</label
        >
        <select
          id="snap-grid-select"
          aria-label="Grid resolution"
          :title="`Grid snap resolution: ${snapStep === 1 ? '1/16' : snapStep === 2 ? '1/8' : '1/4'}`"
          class="bg-daw-surface border-daw-border text-daw-text rounded-control focus:border-daw-signal cursor-pointer border px-1.5 py-1 font-mono text-xs transition-colors focus:outline-none sm:px-2"
          :value="snapStep"
          @change="onSnapChange"
        >
          <option :value="1">1/16</option>
          <option :value="2">1/8</option>
          <option :value="4">1/4</option>
        </select>
      </div>
    </div>

    <!-- Right Group: Monitoring & Viewport Controls -->
    <div class="roll-toolbar-secondary flex shrink-0 items-center gap-1.5 sm:gap-2 xl:gap-3">
      <!-- Live Monitoring Duo (Audition & Follow) -->
      <div
        class="monitoring-group flex shrink-0 items-center gap-1 sm:gap-1.5"
        role="group"
        aria-label="Monitoring Controls"
      >
        <!-- Audition Toggle (Acoustic Feedback) -->
        <DawButton
          appearance="ghost"
          variant="signal"
          size="sm"
          :active="isAuditionEnabled"
          :icon="isAuditionEnabled ? Headphones : HeadphoneOff"
          class="tool-btn monitoring-btn"
          :title="isAuditionEnabled ? 'Audition Note Preview: Active (U)' : 'Audition Note Preview: Muted (U)'"
          aria-label="Toggle Audition Note Preview"
          @click="isAuditionEnabled = !isAuditionEnabled"
        >
          <span class="roll-toolbar-monitor-label">Audition</span>
        </DawButton>

        <!-- Follow Playhead Toggle (Visual Feedback) -->
        <DawButton
          appearance="ghost"
          variant="signal"
          size="sm"
          :active="isFollowEnabled"
          :icon="isFollowEnabled ? LocateFixed : LocateOff"
          class="tool-btn monitoring-btn"
          :title="
            isFollowEnabled
              ? 'Auto Scroll Active (view follows playhead)'
              : 'Auto Scroll Off (click to follow playhead)'
          "
          aria-label="Toggle Auto Scroll Follow"
          @click="isFollowEnabled = !isFollowEnabled"
        >
          <span class="roll-toolbar-monitor-label">Follow</span>
        </DawButton>
      </div>

      <div class="roll-toolbar-divider bg-daw-border h-4 w-px shrink-0" />

      <!-- View Navigation & Zoom Controls -->
      <PianoRollZoomControls
        class="shrink-0"
        @zoom-in-horizontal="emit('zoomIn')"
        @zoom-out-horizontal="emit('zoomOut')"
        @zoom-in-vertical="emit('zoomInVertical')"
        @zoom-out-vertical="emit('zoomOutVertical')"
        @reset-zoom="emit('resetZoom')"
        @fit-loop="emit('fitLoop')"
        @fit-height="emit('fitHeight')"
      />

      <!-- Velocity Lane Toggle (melody-only bottom editor) -->
      <template v-if="activeTrack === 'melody'">
        <div class="roll-toolbar-divider bg-daw-border h-4 w-px shrink-0" />

        <DawIconButton
          :icon="AudioLines"
          size="sm"
          appearance="panel"
          variant="signal"
          :active="isVelocityLaneOpen"
          :title="isVelocityLaneOpen ? 'Collapse Velocity Lane' : 'Expand Velocity Lane'"
          aria-label="Toggle Velocity Lane"
          @click="isVelocityLaneOpen = !isVelocityLaneOpen"
        />
      </template>
    </div>
  </header>
</template>

<script setup lang="ts">
  import {
    AudioLines,
    Eraser,
    Hand,
    HeadphoneOff,
    Headphones,
    LassoSelect,
    LocateFixed,
    LocateOff,
    MousePointer,
    Pencil
  } from '@lucide/vue'
  import type { ToolMode } from '@/composables/pianoroll/noteOps'
  import type { PianoRollTrack } from '@/composables/pianoroll/usePianoRollCanvas'
  import { DEFAULT_UI_PREFERENCES } from '@/config/ui-defaults'
  import DawButton from '@/components/common/DawButton.vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import PianoRollZoomControls from './PianoRollZoomControls.vue'

  const activeTool = defineModel<ToolMode>('activeTool', { default: DEFAULT_UI_PREFERENCES.activeTool })
  const activeTrack = defineModel<PianoRollTrack>('activeTrack', { default: DEFAULT_UI_PREFERENCES.activeTrack })
  const snapStep = defineModel<number>('snapStep', { default: DEFAULT_UI_PREFERENCES.snapStep })
  const isAuditionEnabled = defineModel<boolean>('isAuditionEnabled', {
    default: DEFAULT_UI_PREFERENCES.isAuditionEnabled
  })
  const isFollowEnabled = defineModel<boolean>('isFollowEnabled', { default: true })
  const isVelocityLaneOpen = defineModel<boolean>('isVelocityLaneOpen', {
    default: DEFAULT_UI_PREFERENCES.isVelocityLaneOpen
  })

  const emit = defineEmits<{
    zoomIn: []
    zoomOut: []
    zoomInVertical: []
    zoomOutVertical: []
    resetZoom: []
    fitLoop: []
    fitHeight: []
  }>()

  function onSnapChange(event: Event): void {
    const target = event.target as HTMLSelectElement
    snapStep.value = Number(target.value)
  }
</script>
