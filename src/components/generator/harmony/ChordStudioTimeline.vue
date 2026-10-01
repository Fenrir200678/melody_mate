<template>
  <div class="bg-daw-bg flex h-full w-full flex-1 flex-col overflow-hidden select-none">
    <ProgressionToolbar
      :total-bars="totalBars"
      :zoom-percentage="zoomPercentage"
      :can-zoom-in="canZoomIn"
      :can-zoom-out="canZoomOut"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @reset-zoom="resetZoom"
    />

    <!-- Timeline Workspace -->
    <div class="flex min-h-0 w-full flex-1 flex-col overflow-hidden p-2.5">
      <div
        class="rounded-panel border-daw-border bg-daw-panel/50 flex min-h-0 flex-1 flex-col overflow-hidden border shadow-inner"
      >
        <div
          ref="timelineScrollContainer"
          class="relative flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-hidden"
          @contextmenu.prevent
        >
          <div class="relative flex min-w-full flex-1 flex-col" :style="{ width: `${totalTrackBars * barWidth}px` }">
            <TimelineRuler :bars="totalTrackBars" :bar-width="barWidth" />

            <!-- Track Lane Body -->
            <div
              class="relative min-h-24 flex-1"
              @dblclick.self="onEmptyDoubleClick"
              @contextmenu.prevent
              @dragenter="onPaletteDragOver"
              @dragover="onPaletteDragOver"
              @dragleave="onPaletteDragLeave"
              @drop="onPaletteDrop"
            >
              <TimelineGrid :bars="totalTrackBars" :bar-width="barWidth" />

              <!-- Playhead Line (during DAW transport playback) -->
              <div
                v-if="audioStore.isPlaying"
                class="bg-daw-signal pointer-events-none absolute top-0 bottom-0 z-20 w-0.5 shadow-sm transition-all duration-75"
                :style="{ left: `${(audioStore.currentStep / 16) * barWidth}px` }"
              >
                <div class="bg-daw-signal rounded-chip h-2 w-2 -translate-x-0.75 shadow-xs" />
              </div>

              <ChordPaletteDropPreview v-if="dropPreview" :target="dropPreview" :bar-width="barWidth" />

              <TimelineEmptyState v-if="chords.length === 0" @add-tonic="addTonic" />

              <template v-else>
                <ChordGapSlot
                  v-for="gap in gaps"
                  :key="gap.id"
                  :gap="gap"
                  :bar-width="barWidth"
                  :drop-target="dropPreview?.gapId === gap.id"
                  @fill="fillGap"
                />
                <ChordBlock
                  v-for="chord in chords"
                  :key="chord.id"
                  :chord="chord"
                  :total-track-bars="totalTrackBars"
                  :scroll-left="() => timelineScrollContainer?.scrollLeft ?? 0"
                  :bar-width="barWidth"
                  :chord-function="chordFunctions.get(chord.id) ?? 'custom'"
                  :selected="harmonyStore.selectedChordId === chord.id"
                  :sounding="isChordCurrentlySounding(chord)"
                  :dragging="dragState?.draggedChordId === chord.id"
                  @select="onClick($event, chord)"
                  @drag-start="onPointerDown($event, chord)"
                  @drag-move="onPointerMove"
                  @drag-end="onPointerUp"
                  @drag-cancel="onPointerCancel"
                  @cancel="cancelDrag"
                  @nudge="(direction, clone) => nudgeChord(chord, direction, clone)"
                  @delete="deleteChord(chord.id)"
                />

                <ChordDragPreview
                  v-if="dragState && draggedChord"
                  :chord="draggedChord"
                  :start-bar="dragState.previewStartBar"
                  :bar-width="barWidth"
                  :is-cloning="dragState.isCloning"
                />

                <VoiceLeadingBadge
                  v-for="badge in voiceLeadingBadges"
                  :key="badge.id"
                  :distance="badge.distance"
                  :left="badge.left"
                />

                <ChordGhostSlot
                  v-if="endBar < PROJECT_BAR_BOUNDS.max"
                  :start-bar="endBar"
                  :bar-width="barWidth"
                  @add="addNextChord"
                />
              </template>
            </div>
          </div>
        </div>

        <ChordStudioInspector />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useElementSize, useEventListener } from '@vueuse/core'
  import type { ChordEvent } from '@/core/schemas/chord.schema'
  import { type ChordFunction, getChordFunction } from '@/core/theory/chord-function'
  import { voiceLeadingDistance } from '@/core/theory/voice-leading'
  import { PROJECT_BAR_BOUNDS } from '@/config/defaults'
  import { useChordPaletteDrop } from '@/composables/harmony/useChordPaletteDrop'
  import ChordPaletteDropPreview from './timeline/ChordPaletteDropPreview.vue'
  import { useChordInsertion } from '@/composables/harmony/useChordInsertion'
  import { useProgressionGaps } from '@/composables/harmony/useProgressionGaps'
  import type { ChordMode } from '@/core/theory/chord.engine'
  import { DEFAULT_CHORD_PALETTE } from '@/config/ui-defaults'
  import { useChordBlockDrag } from '@/composables/harmony/useChordBlockDrag'
  import { useProgressionLayout } from '@/composables/harmony/useProgressionLayout'
  import { useTimelineZoom } from '@/composables/harmony/useTimelineZoom'
  import { useAudioStore } from '@/stores/audio.store'
  import { useHarmonyStore } from '@/stores/harmony.store'
  import { useUiStore } from '@/stores/ui.store'
  import { useProjectStore } from '@/stores/project.store'
  import ChordStudioInspector from './ChordStudioInspector.vue'
  import ChordBlock from './timeline/ChordBlock.vue'
  import ChordDragPreview from './timeline/ChordDragPreview.vue'
  import ChordGhostSlot from './timeline/ChordGhostSlot.vue'
  import ChordGapSlot from './timeline/ChordGapSlot.vue'
  import ProgressionToolbar from './timeline/ProgressionToolbar.vue'
  import TimelineEmptyState from './timeline/TimelineEmptyState.vue'
  import TimelineGrid from './timeline/TimelineGrid.vue'
  import TimelineRuler from './timeline/TimelineRuler.vue'
  import VoiceLeadingBadge from './timeline/VoiceLeadingBadge.vue'

  const props = withDefaults(defineProps<{ chordMode?: ChordMode; paletteDegree?: number | null }>(), {
    chordMode: DEFAULT_CHORD_PALETTE.mode,
    paletteDegree: DEFAULT_CHORD_PALETTE.selectedDegree
  })
  const harmonyStore = useHarmonyStore()
  const audioStore = useAudioStore()
  const uiStore = useUiStore()
  const projectStore = useProjectStore()

  const timelineScrollContainer = ref<HTMLElement | null>(null)
  const { width: containerWidth } = useElementSize(timelineScrollContainer)

  const { chords, endBar, totalTrackBars, totalBars } = useProgressionLayout()
  const { barWidth, zoomPercentage, zoomIn, zoomOut, resetZoom, MIN_BAR_WIDTH, MAX_BAR_WIDTH } = useTimelineZoom({
    containerWidth,
    totalBars: totalTrackBars
  })
  const { insertChordAt, appendChord } = useChordInsertion()
  const { gaps, fillGap, insertInEmptyBar } = useProgressionGaps({
    paletteDegree: () => props.paletteDegree,
    chordMode: () => props.chordMode
  })
  const { dragState, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick, cancelDrag, nudgeChord } =
    useChordBlockDrag({
      chords: () => chords.value,
      barWidth: () => barWidth.value,
      totalBars: () => projectStore.bars,
      scrollLeft: () => timelineScrollContainer.value?.scrollLeft ?? 0,
      onSelect: onChordSelect,
      onCommit: (id, startBar, clone) => {
        uiStore.setActiveTrack('chords')
        if (clone) harmonyStore.duplicateChordToPosition(id, startBar)
        else harmonyStore.moveChordToPosition(id, startBar)
      }
    })
  const { dropPreview, onPaletteDragOver, onPaletteDragLeave, onPaletteDrop } = useChordPaletteDrop({
    viewport: () => timelineScrollContainer.value,
    barWidth: () => barWidth.value,
    totalBars: () => totalTrackBars.value,
    gaps: () => gaps.value
  })
  const draggedChord = computed(() => chords.value.find((chord) => chord.id === dragState.value?.draggedChordId))

  const canZoomIn = computed(() => barWidth.value < MAX_BAR_WIDTH)
  const canZoomOut = computed(() => barWidth.value > MIN_BAR_WIDTH)

  /** One palette lookup per chord; the block needs function for both its surface and its roman. */
  const chordFunctions = computed(() => {
    const palette = harmonyStore.diatonicPalette
    const map = new Map<string, ChordFunction>()
    for (const chord of chords.value) {
      map.set(chord.id, getChordFunction(chord, palette))
    }
    return map
  })

  const voiceLeadingBadges = computed(() => {
    const list = chords.value
    const badges: { id: string; distance: number; left: number }[] = []
    for (let i = 0; i < list.length - 1; i++) {
      const chord = list[i]
      badges.push({
        id: `vl-${chord.id}`,
        distance: voiceLeadingDistance(chord.voicing, list[i + 1].voicing),
        left: (chord.startBar + chord.durationBars) * barWidth.value
      })
    }
    return badges
  })

  const tonicChord = computed(() => harmonyStore.diatonicPalette[0] ?? null)

  function isChordCurrentlySounding(chord: ChordEvent): boolean {
    if (audioStore.isPreviewingProgression) {
      return audioStore.previewingChordId === chord.id
    }
    if (audioStore.isPlaying) {
      const currentBar = audioStore.currentStep / 16
      return currentBar >= chord.startBar && currentBar < chord.startBar + chord.durationBars
    }
    return false
  }

  function onChordSelect(chord: ChordEvent): void {
    harmonyStore.selectChord(chord.id)
    audioStore.auditionChord(chord.voicing)
  }

  function deleteChord(id: string): void {
    uiStore.setActiveTrack('chords')
    uiStore.setActiveHistoryContext('chord')
    harmonyStore.removeChord(id)
  }

  function deleteSelectedChord(): void {
    if (!harmonyStore.selectedChordId) return
    deleteChord(harmonyStore.selectedChordId)
  }

  function addTonic(): void {
    if (tonicChord.value) {
      insertChordAt(tonicChord.value, 'triad', 0)
    }
  }

  function addNextChord(): void {
    const chord = harmonyStore.diatonicPalette.find((c) => c.degree === props.paletteDegree) ?? tonicChord.value
    if (chord) {
      appendChord(chord, props.chordMode)
    }
  }

  function onEmptyDoubleClick(event: MouseEvent): void {
    if (dragState.value || event.button !== 0) return
    const lane = event.currentTarget as HTMLElement
    const positionBar = (event.clientX - lane.getBoundingClientRect().left) / barWidth.value
    if (positionBar >= totalTrackBars.value || positionBar >= PROJECT_BAR_BOUNDS.max) return
    insertInEmptyBar(positionBar)
  }

  function onWindowKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return
    if (!harmonyStore.selectedChordId) return

    const target = e.target as HTMLElement | null
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      return
    }

    // Fires on window, so the dock root pointerdown never claimed the chords track for us;
    // deleteSelectedChord does it instead.
    e.preventDefault()
    deleteSelectedChord()
  }

  useEventListener(window, 'keydown', onWindowKeyDown)

  onMounted(() => {
    if (timelineScrollContainer.value && chords.value.length > 0) {
      if (harmonyStore.selectedChordId) {
        const chord = chords.value.find((c) => c.id === harmonyStore.selectedChordId)
        if (chord) {
          const chordPixelLeft = chord.startBar * barWidth.value
          const container = timelineScrollContainer.value
          if (chordPixelLeft < container.scrollLeft || chordPixelLeft > container.scrollLeft + container.clientWidth) {
            container.scrollLeft = Math.max(0, chordPixelLeft - 24)
          }
          return
        }
      }
      timelineScrollContainer.value.scrollLeft = 0
    }
  })
</script>
