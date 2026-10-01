<template>
  <div class="daw-piano-roll">
    <!-- Top Toolbar (Track Selector, Smart Tools, Grid Snapping, Audition, Zoom) -->
    <PianoRollToolbar
      v-model:active-tool="activeTool"
      v-model:active-track="activeTrack"
      v-model:snap-step="snapStep"
      v-model:is-audition-enabled="isAuditionEnabled"
      v-model:is-follow-enabled="isFollowEnabled"
      v-model:is-velocity-lane-open="isVelocityLaneOpen"
      @zoom-in="zoomInHorizontal"
      @zoom-out="zoomOutHorizontal"
      @zoom-in-vertical="zoomInVertical"
      @zoom-out-vertical="zoomOutVertical"
      @reset-zoom="resetZoom"
      @fit-loop="fitLoop"
      @fit-height="fitHeight"
    />

    <PianoRollWorkRangeControls />

    <!-- Beat Ruler & Loop Region Track -->
    <PianoRollRuler
      ref="rulerRef"
      v-model:loop-start-step="loopStartStep"
      v-model:loop-end-step="loopEndStep"
      :bars="bars"
      :step-width="stepWidth"
      :scroll-x="scrollX"
      :keyboard-width="keyboardWidth"
      :current-step="currentStep"
      :is-playing="isPlaying"
      :snap-step="snapStep"
      :section-letters="sectionLetters"
      :motif-pattern="motifPattern"
      :notes="notes"
      :selected-note-ids="selectedNoteIds"
      :work-range="workRange"
      @seek-step="onSeekStep"
      @select-section="emit('selectSection', $event)"
    />

    <!-- Interactive HTML5 Canvas Viewport -->
    <div ref="viewportRef" class="roll-viewport">
      <canvas
        ref="canvasRef"
        aria-label="Piano roll. Drag empty space outside the work range to draw it, inside to move it, or at either edge to resize it by steps. Click outside to target the entire project. Cmd or Ctrl + drag, or the Lasso tool, selects notes."
      />

      <!-- Vertical Scrollbar for pitch navigation (C2-C6) -->
      <DawScrollbar
        v-model:offset="scrollY"
        orientation="vertical"
        class="absolute top-0 right-0 bottom-0 z-10"
        :visible="viewportHeight"
        :total="totalContentHeight"
        :max-offset="maxScrollY"
        @update:offset="requestDraw"
      />
    </div>

    <!-- Horizontal Scrollbar for timeline/bars navigation -->
    <DawScrollbar
      v-model:offset="scrollX"
      orientation="horizontal"
      :visible="Math.max(0, viewportWidth - keyboardWidth)"
      :total="totalProjectWidth"
      :max-offset="maxScrollX"
      :indent="keyboardWidth"
      @update:offset="requestDraw"
    />

    <!-- Bottom Velocity Lane (melody track only - chords carry no velocity) -->
    <template v-if="activeTrack === 'melody'">
      <DawResizeHandle
        v-if="isVelocityLaneOpen && !isMobile"
        :model-value="velocityLaneHeight"
        orientation="horizontal"
        side="bottom"
        :min="VELOCITY_LANE_MIN_HEIGHT"
        :max="VELOCITY_LANE_MAX_HEIGHT"
        :default-value="VELOCITY_LANE_DEFAULT_HEIGHT"
        label="Resize velocity lane"
        @update:model-value="handleUpdateVelocityLaneHeight"
      />

      <VelocityLane
        v-if="isVelocityLaneOpen"
        v-model:notes="notes"
        v-model:selected-note-ids="selectedNoteIds"
        :scroll-x="scrollX"
        :step-width="stepWidth"
        :keyboard-width="keyboardWidth"
        :bars="bars"
        :height="velocityLaneHeight"
        :is-audition-enabled="isAuditionEnabled"
        @select-note="(id, isShift) => emit('selectNote', id, isShift)"
        @audition-note="handleAuditionNote"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
  import { useTemplateRef, watch } from 'vue'
  import type { WorkRange } from '@/core/generator/work-range'
  import { usePianoRollRuntime } from '@/composables/pianoroll/usePianoRollRuntime'
  import type { ChordEvent } from '@/core/schemas/chord.schema'
  import type { AppNote } from '@/core/schemas/note.schema'
  import type { MotifPattern } from '@/core/schemas/generator.schema'
  import type { DiatonicChord } from '@/core/theory/chord.engine'
  import { type PianoRollTrack } from '@/composables/pianoroll/usePianoRollCanvas'
  import { type ToolMode } from '@/composables/pianoroll/noteOps'
  import {
    useUiStore,
    VELOCITY_LANE_DEFAULT_HEIGHT,
    VELOCITY_LANE_MAX_HEIGHT,
    VELOCITY_LANE_MIN_HEIGHT
  } from '@/stores/ui.store'
  import { DEFAULT_CANVAS_GRID, DEFAULT_UI_PREFERENCES } from '@/config/ui-defaults'
  import { DEFAULT_PROJECT_SETTINGS } from '@/config/defaults'
  import DawResizeHandle from '@/components/common/DawResizeHandle.vue'
  import DawScrollbar from './DawScrollbar.vue'
  import PianoRollRuler from './PianoRollRuler.vue'
  import PianoRollToolbar from './PianoRollToolbar.vue'
  import PianoRollWorkRangeControls from './PianoRollWorkRangeControls.vue'
  import VelocityLane from './VelocityLane.vue'

  const notes = defineModel<AppNote[]>('notes', { default: () => [] })
  const selectedNoteIds = defineModel<string[]>('selectedNoteIds', { default: () => [] })
  const chords = defineModel<ChordEvent[]>('chords', { default: () => [] })
  const selectedChordNoteIds = defineModel<string[]>('selectedChordNoteIds', { default: () => [] })
  const activeTrack = defineModel<PianoRollTrack>('activeTrack', { default: DEFAULT_UI_PREFERENCES.activeTrack })
  const activeTool = defineModel<ToolMode>('activeTool', { default: DEFAULT_UI_PREFERENCES.activeTool })
  const snapStep = defineModel<number>('snapStep', { default: DEFAULT_UI_PREFERENCES.snapStep })
  const isAuditionEnabled = defineModel<boolean>('isAuditionEnabled', {
    default: DEFAULT_UI_PREFERENCES.isAuditionEnabled
  })
  const isScaleLocked = defineModel<boolean>('isScaleLocked', { default: DEFAULT_UI_PREFERENCES.isScaleLocked })
  const isFollowEnabled = defineModel<boolean>('isFollowEnabled', { default: true })
  const isVelocityLaneOpen = defineModel<boolean>('isVelocityLaneOpen', {
    default: DEFAULT_UI_PREFERENCES.isVelocityLaneOpen
  })
  const velocityLaneHeight = defineModel<number>('velocityLaneHeight', { default: VELOCITY_LANE_DEFAULT_HEIGHT })
  const workRange = defineModel<WorkRange>('workRange', { required: true })
  const loopStartStep = defineModel<number>('loopStartStep', { default: DEFAULT_PROJECT_SETTINGS.loopStartStep })
  const loopEndStep = defineModel<number>('loopEndStep', { default: DEFAULT_PROJECT_SETTINGS.loopEndStep })

  const props = withDefaults(
    defineProps<{
      isChordStudioOpen?: boolean
      chordPalette?: DiatonicChord[]
      rootKey?: string
      scale?: string
      bars?: number
      sectionLetters?: string[]
      motifPattern?: MotifPattern
      bpm?: number
      isPlaying?: boolean
      currentStep?: number
      // Non-reactive continuous playhead clock (fractional steps) from the transport loop
      playhead?: { step: number }
      minMidi?: number
      maxMidi?: number
      rowHeight?: number
      stepWidth?: number
      keyboardWidth?: number
    }>(),
    {
      isChordStudioOpen: false,
      chordPalette: () => [],
      rootKey: DEFAULT_PROJECT_SETTINGS.key,
      scale: DEFAULT_PROJECT_SETTINGS.scale,
      bars: DEFAULT_PROJECT_SETTINGS.bars,
      sectionLetters: () => [],
      motifPattern: 'FREE',
      bpm: DEFAULT_PROJECT_SETTINGS.bpm,
      isPlaying: false,
      currentStep: 0,
      playhead: undefined,
      minMidi: 24,
      maxMidi: 108,
      rowHeight: DEFAULT_CANVAS_GRID.rowHeight,
      stepWidth: DEFAULT_CANVAS_GRID.stepWidth,
      keyboardWidth: 56
    }
  )

  const emit = defineEmits<{
    auditionNote: [pitch: string]
    auditionChord: [voicing: string[]]
    seekStep: [step: number]
    selectNote: [noteId: string, isShift: boolean]
    selectSection: [bar: number]
  }>()

  const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef')
  const viewportRef = useTemplateRef<HTMLDivElement>('viewportRef')
  const rulerRef = useTemplateRef<InstanceType<typeof PianoRollRuler>>('rulerRef')

  const {
    scrollX,
    scrollY,
    stepWidth,
    rowHeight,
    keyboardWidth,
    requestDraw,
    isMobile,
    viewportWidth,
    viewportHeight,
    totalContentHeight,
    maxScrollY,
    totalProjectWidth,
    maxScrollX,
    handleUpdateVelocityLaneHeight,
    handleAuditionNote,
    onSeekStep,
    scrollToNotes,
    scrollToChords,
    scrollToMidi,
    zoomInHorizontal,
    zoomOutHorizontal,
    zoomInVertical,
    zoomOutVertical,
    resetZoom,
    fitLoop,
    fitHeight
  } = usePianoRollRuntime({
    props,
    notes,
    selectedNoteIds,
    chords,
    selectedChordNoteIds,
    activeTrack,
    activeTool,
    snapStep,
    workRange,
    isAuditionEnabled,
    isScaleLocked,
    isFollowEnabled,
    velocityLaneHeight,
    loopStartStep,
    loopEndStep,
    canvasRef,
    viewportRef,
    rulerRef,
    emit
  })

  // Respond to global zoom signals from keyboard shortcuts or other store callers
  const uiStore = useUiStore()
  watch(
    () => uiStore.zoomSignal,
    (signal) => {
      if (!signal) return
      const actions: Record<string, () => void> = {
        zoomInHorizontal,
        zoomOutHorizontal,
        zoomInVertical,
        zoomOutVertical,
        fitLoop,
        fitHeight,
        resetZoom
      }
      actions[signal.action]?.()
    }
  )

  defineExpose({
    scrollX,
    scrollY,
    stepWidth,
    rowHeight,
    notes,
    selectedNoteIds,
    chords,
    selectedChordNoteIds,
    activeTrack,
    activeTool,
    internalNotes: notes,
    internalSelectedNoteIds: selectedNoteIds,
    internalActiveTool: activeTool,
    scrollToNotes,
    scrollToChords,
    scrollToMidi,
    requestDraw,
    zoomInHorizontal,
    zoomOutHorizontal,
    zoomInVertical,
    zoomOutVertical,
    resetZoom,
    fitLoop,
    fitHeight
  })
</script>
