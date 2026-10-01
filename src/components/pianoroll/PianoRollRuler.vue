<template>
  <div
    class="piano-roll-ruler border-daw-border bg-daw-panel text-daw-text-muted text-micro flex h-6 items-stretch border-b font-mono select-none"
  >
    <!-- Sticky left keyboard spacer matching piano keys width -->
    <div
      class="ruler-spacer border-daw-border bg-daw-panel text-daw-text-muted text-micro flex shrink-0 items-center justify-center border-r font-bold tracking-wider uppercase"
      :style="{ width: `${keyboardWidth}px` }"
    >
      Bar
    </div>

    <!-- Scrollable ruler timeline tracks -->
    <div
      ref="trackRef"
      class="ruler-track relative h-full flex-1 cursor-pointer overflow-hidden"
      @pointerdown="onTrackPointerDown"
      @pointermove="onTrackPointerMove"
      @pointerup="onTrackPointerUp"
      @pointercancel="onTrackPointerUp"
    >
      <div
        class="ruler-content pointer-events-none absolute top-0 bottom-0 left-0"
        :style="{ transform: `translateX(${-scrollX}px)` }"
      >
        <!-- Loop Region Indicator with draggable start/end braces -->
        <div
          class="ruler-loop-region border-daw-signal bg-daw-signal/15 absolute top-0 bottom-0 border-b-2"
          :style="{
            left: `${regionStart * stepWidth}px`,
            width: `${Math.max(stepWidth, (regionEnd - regionStart) * stepWidth)}px`
          }"
        >
          <!-- Loop Start Brace (drag to move the loop start) -->
          <div
            class="ruler-loop-handle pointer-events-auto absolute top-0 bottom-0 left-0 z-20 flex w-3 -translate-x-1/2 cursor-ew-resize touch-none items-center justify-center"
            role="slider"
            aria-label="Loop start"
            :aria-valuemin="0"
            :aria-valuemax="totalSteps"
            :aria-valuenow="regionStart"
            @pointerdown="onLoopHandlePointerDown($event, 'start')"
            @pointermove="onLoopHandlePointerMove"
            @pointerup="onLoopHandlePointerUp"
            @pointercancel="onLoopHandlePointerUp"
          >
            <div class="bg-daw-signal h-full w-1 rounded-full opacity-90" />
          </div>

          <!-- Loop End Brace (drag to move the loop end) -->
          <div
            class="ruler-loop-handle pointer-events-auto absolute top-0 right-0 bottom-0 z-20 flex w-3 translate-x-1/2 cursor-ew-resize touch-none items-center justify-center"
            role="slider"
            aria-label="Loop end"
            :aria-valuemin="0"
            :aria-valuemax="totalSteps"
            :aria-valuenow="regionEnd"
            @pointerdown="onLoopHandlePointerDown($event, 'end')"
            @pointermove="onLoopHandlePointerMove"
            @pointerup="onLoopHandlePointerUp"
            @pointercancel="onLoopHandlePointerUp"
          >
            <div class="bg-daw-signal h-full w-1 rounded-full opacity-90" />
          </div>
        </div>

        <!-- Bar and Beat Markers -->
        <div
          v-for="barIndex in totalDisplayBars"
          :key="`bar-${barIndex}`"
          class="ruler-bar absolute top-0 bottom-0 flex"
          :class="{ 'opacity-35': barIndex > bars }"
          :style="{
            left: `${(barIndex - 1) * 16 * stepWidth}px`,
            width: `${16 * stepWidth}px`
          }"
        >
          <!-- Major Bar Tick (1, 2, 3...) -->
          <div class="ruler-bar-tick absolute top-0 bottom-0 left-0 flex items-center gap-1 pl-1">
            <div class="bg-daw-border h-full w-px" />
            <span class="text-daw-text leading-none font-bold">
              {{ barIndex }}
            </span>
            <button
              v-if="stepWidth >= 16 && barIndex <= bars && sectionLetters[barIndex - 1]"
              type="button"
              class="text-2xs rounded-chip hover:border-daw-text-muted hover:bg-daw-surface-elevated active:bg-daw-signal/25 focus-visible:ring-daw-signal pointer-events-auto flex h-5 min-w-6 cursor-pointer items-center justify-center border px-1 font-mono font-bold focus-visible:ring-1"
              :class="
                isSectionSelected(barIndex - 1)
                  ? 'border-daw-signal bg-daw-signal/25 text-daw-signal'
                  : 'border-daw-text-muted/40 bg-daw-surface-elevated text-daw-text'
              "
              :title="motifHint[motifPattern]"
              :aria-label="`Select section ${sectionLetters[barIndex - 1]}, bar ${barIndex}`"
              :aria-pressed="isSectionSelected(barIndex - 1)"
              @pointerdown.stop
              @keydown.enter.stop
              @keydown.space.stop
              @click.stop="emit('selectSection', barIndex - 1)"
            >
              {{ sectionLetters[barIndex - 1] }}
            </button>
          </div>

          <!-- Quarter Beat Ticks (e.g. 1.2, 1.3, 1.4) -->
          <div
            v-for="beatIndex in 3"
            :key="`bar-${barIndex}-beat-${beatIndex}`"
            class="ruler-beat-tick absolute top-0 bottom-0 flex items-center gap-1"
            :style="{ left: `${beatIndex * 4 * stepWidth}px` }"
          >
            <div class="mb-1 h-2.5 w-px self-end bg-white/12" />
            <span v-if="stepWidth >= 16" class="text-daw-text-muted text-micro pl-0.5 leading-none opacity-75">
              {{ barIndex }}.{{ beatIndex + 1 }}
            </span>
          </div>
        </div>

        <!-- Project End Boundary Line on Ruler -->
        <div
          v-if="bars < totalDisplayBars"
          class="ruler-end-marker pointer-events-none absolute top-0 bottom-0 z-10"
          :style="{ left: `${bars * 16 * stepWidth}px` }"
        >
          <div class="bg-daw-border h-full w-px" />
        </div>

        <!-- Playhead Indicator Pin on Ruler (positioned imperatively by the parent render loop) -->
        <div ref="playheadRef" class="ruler-playhead pointer-events-none absolute top-0 bottom-0 left-0 z-10">
          <!-- Downward arrowhead indicator -->
          <div
            class="border-t-daw-signal h-0 w-0 -translate-x-1/2 border-x-4 border-t-[6px] border-x-transparent drop-shadow-sm"
          />
          <div class="bg-daw-signal h-full w-0.5 -translate-x-1/2" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
  import { useElementSize } from '@vueuse/core'
  import type { AppNote } from '@/core/schemas/note.schema'
  import type { MotifPattern } from '@/core/schemas/generator.schema'
  import type { WorkRange } from '@/core/generator/work-range'
  import { STEPS_PER_BAR } from '@/core/schemas/project.schema'
  import { DEFAULT_CANVAS_GRID, DEFAULT_UI_PREFERENCES } from '@/config/ui-defaults'
  import { DEFAULT_PROJECT_SETTINGS } from '@/config/defaults'
  import { motifHint } from '@/utils/motif-options'
  import { useRulerScrubbing } from '@/composables/pianoroll/useRulerScrubbing'
  import { getFullySelectedBars } from '@/utils/pianoroll-selection'

  const props = withDefaults(
    defineProps<{
      bars?: number
      stepWidth?: number
      scrollX?: number
      keyboardWidth?: number
      currentStep?: number
      isPlaying?: boolean
      snapStep?: number
      sectionLetters?: string[]
      motifPattern?: MotifPattern
      notes?: AppNote[]
      selectedNoteIds?: string[]
      workRange?: WorkRange
    }>(),
    {
      bars: DEFAULT_PROJECT_SETTINGS.bars,
      stepWidth: DEFAULT_CANVAS_GRID.stepWidth,
      scrollX: DEFAULT_CANVAS_GRID.scrollX,
      keyboardWidth: 56,
      currentStep: 0,
      isPlaying: false,
      snapStep: DEFAULT_UI_PREFERENCES.snapStep,
      sectionLetters: () => [],
      motifPattern: 'FREE',
      notes: () => [],
      selectedNoteIds: () => [],
      workRange: undefined
    }
  )

  const loopStartStep = defineModel<number>('loopStartStep', { default: DEFAULT_PROJECT_SETTINGS.loopStartStep })
  const loopEndStep = defineModel<number>('loopEndStep', { default: DEFAULT_PROJECT_SETTINGS.loopEndStep })

  const emit = defineEmits<{
    seekStep: [step: number]
    selectSection: [bar: number]
  }>()

  const trackRef = useTemplateRef<HTMLDivElement>('trackRef')
  const { width: trackWidth } = useElementSize(trackRef)

  const totalSteps = computed(() => props.bars * STEPS_PER_BAR)
  const selectedBars = computed(() => getFullySelectedBars(props.notes, props.selectedNoteIds))

  function isSectionSelected(bar: number): boolean {
    if (props.workRange) {
      const barStart = bar * STEPS_PER_BAR
      const barEnd = barStart + STEPS_PER_BAR
      const isNarrowed = props.workRange.startStep > 0 || props.workRange.endStep < totalSteps.value
      if (isNarrowed && props.workRange.startStep <= barStart && props.workRange.endStep >= barEnd) {
        return true
      }
    }
    return selectedBars.value.has(bar)
  }
  const { onTrackPointerDown, onTrackPointerMove, onTrackPointerUp } = useRulerScrubbing(trackRef, props, (step) =>
    emit('seekStep', step)
  )

  // While a brace is dragged, the preview step drives rendering so the region tracks the
  // pointer even before the parent store round-trips; on release it falls back to the model.
  const draggingHandle = ref<'start' | 'end' | null>(null)
  const dragStep = ref(0)

  const regionStart = computed(() => (draggingHandle.value === 'start' ? dragStep.value : loopStartStep.value))
  const regionEnd = computed(() => (draggingHandle.value === 'end' ? dragStep.value : loopEndStep.value))

  function stepFromClientX(clientX: number): number {
    const track = trackRef.value
    if (!track || props.stepWidth <= 0) return 0
    const rect = track.getBoundingClientRect()
    const rawStep = (clientX - rect.left + props.scrollX) / props.stepWidth
    const snap = props.snapStep > 0 ? props.snapStep : 1
    return Math.round(rawStep / snap) * snap
  }

  function onLoopHandlePointerDown(e: PointerEvent, handle: 'start' | 'end'): void {
    e.preventDefault()
    e.stopPropagation()
    draggingHandle.value = handle
    dragStep.value = handle === 'start' ? loopStartStep.value : loopEndStep.value
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onLoopHandlePointerMove(e: PointerEvent): void {
    const handle = draggingHandle.value
    if (!handle) return

    const step = stepFromClientX(e.clientX)
    if (handle === 'start') {
      dragStep.value = Math.max(0, Math.min(regionEnd.value - 1, step))
      loopStartStep.value = dragStep.value
    } else {
      dragStep.value = Math.max(regionStart.value + 1, Math.min(totalSteps.value, step))
      loopEndStep.value = dragStep.value
    }
  }

  function onLoopHandlePointerUp(e: PointerEvent): void {
    if (!draggingHandle.value) return
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // Ignore if already released
    }
    draggingHandle.value = null
  }

  // Playhead pin is positioned imperatively (translate3d) so continuous sub-step values
  // can be applied at frame rate without re-renders. Parent drives setPlayheadStep() per
  // animation frame during playback; the fallback watcher snaps it to whole steps when idle.
  const playheadRef = useTemplateRef<HTMLDivElement>('playheadRef')

  function setPlayheadStep(step: number): void {
    const el = playheadRef.value
    if (el) {
      el.style.transform = `translate3d(${step * props.stepWidth}px, 0, 0)`
    }
  }

  defineExpose({ setPlayheadStep })

  onMounted(() => setPlayheadStep(props.currentStep))

  // Idle fallback: snap pin to step on seek/zoom/pause
  watch([() => props.currentStep, () => props.stepWidth, () => props.isPlaying], ([step, , playing]) => {
    if (!playing) setPlayheadStep(step)
  })

  const totalDisplayBars = computed(() => {
    if (trackWidth.value <= 0 || props.stepWidth <= 0) return props.bars
    const visibleBars = Math.ceil(trackWidth.value / (16 * props.stepWidth))
    return Math.max(props.bars, visibleBars)
  })
</script>
