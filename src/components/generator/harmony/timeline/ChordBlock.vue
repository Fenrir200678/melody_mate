<template>
  <div
    class="absolute top-2 bottom-2 z-5"
    :class="selected || resizeState ? 'z-15' : sounding ? 'z-10' : ''"
    :style="blockStyle"
    @contextmenu.stop.prevent="handleContextMenu"
  >
    <button
      type="button"
      :aria-pressed="selected"
      class="rounded-control focus-visible:ring-daw-signal absolute inset-0 flex cursor-grab touch-none flex-col justify-between border p-2 text-left shadow-xs transition-colors select-none hover:brightness-110 focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing"
      :class="[
        theme.block,
        selected ? 'ring-daw-signal border-daw-signal z-15 shadow-md ring-2' : '',
        sounding ? 'ring-daw-chord border-daw-chord bg-daw-chord/25 z-10 shadow-lg ring-2' : '',
        dragging ? 'opacity-50' : '',
        resizeState ? 'border-daw-chord ring-daw-chord border-dashed ring-1' : ''
      ]"
      :title="`${chord.name} (${chord.roman}) · Click to select & audition · Drag to move · Alt-drag to copy · Left/Right to move · Alt+Left/Right to copy · Right-click or Del to remove`"
      @click="emit('select', $event)"
      @pointerdown="handlePointerDown"
      @pointermove="emit('dragMove', $event)"
      @pointerup="emit('dragEnd', $event)"
      @pointercancel="emit('dragCancel', $event)"
      @lostpointercapture="emit('dragCancel', $event)"
      @contextmenu.stop.prevent="handleContextMenu"
      @keydown.esc.stop.prevent="emit('cancel')"
      @keydown.left.stop.prevent="emit('nudge', -1, $event.altKey)"
      @keydown.right.stop.prevent="emit('nudge', 1, $event.altKey)"
      @keydown.delete.stop.prevent="emit('delete')"
      @keydown.backspace.stop.prevent="emit('delete')"
    >
      <!-- Wide: roman, name, bar span and the actual voicing pitches -->
      <template v-if="density === 'wide'">
        <span class="flex items-center justify-between">
          <span class="flex items-baseline gap-1.5 truncate">
            <span class="font-mono text-xs font-bold" :class="theme.text">{{ chord.roman }}</span>
            <span class="text-daw-text truncate text-xs font-semibold">{{ chord.name }}</span>
          </span>
          <span class="text-daw-text-muted text-micro font-mono">{{ formatBarSpan(displayChord) }}</span>
        </span>

        <span class="flex items-center gap-1 overflow-hidden">
          <span
            v-for="pitch in chord.voicing"
            :key="pitch"
            class="bg-daw-surface/90 rounded-chip text-micro border-daw-border/70 py-0.2 text-daw-text border px-1 font-mono"
          >
            {{ pitch }}
          </span>
        </span>
      </template>

      <!-- Medium: identity plus a coarse length tag -->
      <template v-else-if="density === 'medium'">
        <span class="flex h-full flex-col justify-between">
          <span class="flex items-baseline gap-1 truncate">
            <span class="font-mono text-xs font-bold" :class="theme.text">{{ chord.roman }}</span>
            <span class="text-daw-text truncate text-xs font-semibold">{{ chord.name }}</span>
          </span>
          <span class="text-daw-text-muted text-micro font-mono">{{ displayChord.durationBars }}b</span>
        </span>
      </template>

      <!-- Compact: centred identity only, no room for metadata -->
      <template v-else>
        <span class="flex h-full flex-col items-center justify-center text-center">
          <span class="text-2xs font-mono leading-tight font-bold" :class="theme.text">{{ chord.roman }}</span>
          <span class="text-daw-text text-2xs leading-tight font-semibold">{{ chord.name }}</span>
        </span>
      </template>
    </button>
    <span
      v-if="resizeState"
      class="bg-daw-panel text-daw-chord rounded-chip text-micro pointer-events-none absolute right-0 bottom-1 z-20 px-1 font-mono whitespace-nowrap"
      >{{ displayChord.durationBars }}b</span
    >
    <button
      type="button"
      class="hover:bg-daw-chord/50 focus-visible:bg-daw-chord/50 focus-visible:ring-daw-signal rounded-r-control absolute top-0 right-0 bottom-0 z-20 flex w-1.5 cursor-col-resize touch-none items-center justify-center focus-visible:ring-2 focus-visible:outline-none"
      :aria-label="`Resize ${chord.name} duration, ${displayChord.durationBars} bars`"
      title="Drag to resize chord duration · Left/Right: quarter-bar steps · Escape: cancel"
      @click.stop
      @dblclick.stop
      @pointerdown.stop.prevent="handleResizePointerDown"
      @pointermove.stop="onResizePointerMove"
      @pointerup.stop="onResizePointerUp"
      @pointercancel.stop="onResizePointerCancel"
      @lostpointercapture.stop="onResizePointerCancel"
      @contextmenu.stop.prevent="handleContextMenu"
      @keydown.esc.stop.prevent="cancelResize"
      @keydown.left.stop.prevent="nudgeDuration(chord, -1)"
      @keydown.right.stop.prevent="nudgeDuration(chord, 1)"
    >
      <span aria-hidden="true" class="bg-daw-chord/60 rounded-chip h-4 w-0.5" />
    </button>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { ChordEvent } from '@/core/schemas/chord.schema'
  import type { ChordFunction } from '@/core/theory/chord-function'
  import { blockDensity, calculateBlockGeometry, formatBarSpan } from '@/composables/harmony/timelineOps'
  import { PROJECT_BAR_BOUNDS } from '@/config/defaults'
  import { useChordBlockResize } from '@/composables/harmony/useChordBlockResize'
  import { useHarmonyStore } from '@/stores/harmony.store'
  import { useProjectStore } from '@/stores/project.store'
  import { useUiStore } from '@/stores/ui.store'
  import { FUNCTION_THEME } from '@/utils/harmony/chordFunctionTheme'

  const props = defineProps<{
    chord: ChordEvent
    barWidth: number
    totalTrackBars: number
    scrollLeft: () => number
    chordFunction: ChordFunction
    selected: boolean
    sounding: boolean
    dragging: boolean
  }>()

  const emit = defineEmits<{
    select: [event: MouseEvent]
    delete: []
    dragStart: [event: PointerEvent]
    dragMove: [event: PointerEvent]
    dragEnd: [event: PointerEvent]
    dragCancel: [event: PointerEvent]
    cancel: []
    nudge: [direction: number, clone: boolean]
  }>()

  const harmonyStore = useHarmonyStore()
  const projectStore = useProjectStore()
  const uiStore = useUiStore()
  const {
    resizeState,
    onPointerDown: onResizePointerDown,
    onPointerMove: onResizePointerMove,
    onPointerUp: onResizePointerUp,
    onPointerCancel: onResizePointerCancel,
    cancelResize,
    nudgeDuration
  } = useChordBlockResize({
    chords: () => harmonyStore.chords,
    barWidth: () => props.barWidth,
    totalBars: () => Math.min(props.totalTrackBars, PROJECT_BAR_BOUNDS.max),
    scrollLeft: () => props.scrollLeft(),
    onCommit: (id, durationBars) => {
      uiStore.setActiveTrack('chords')
      const end = props.chord.startBar + durationBars
      if (end > projectStore.bars) projectStore.setBars(Math.ceil(end))
      harmonyStore.resizeChord(id, durationBars)
    }
  })

  function isDeletePointer(event: PointerEvent): boolean {
    return event.button === 2 || (event.button === 0 && event.ctrlKey)
  }

  function handlePointerDown(event: PointerEvent): void {
    if (isDeletePointer(event)) {
      event.preventDefault()
      event.stopPropagation()
      emit('delete')
      return
    }
    emit('dragStart', event)
  }

  function handleResizePointerDown(event: PointerEvent): void {
    if (isDeletePointer(event)) {
      event.preventDefault()
      event.stopPropagation()
      emit('delete')
      return
    }
    onResizePointerDown(event, props.chord)
  }

  function handleContextMenu(event: MouseEvent): void {
    event.preventDefault()
    event.stopPropagation()
    emit('delete')
  }

  const displayChord = computed(() => ({
    ...props.chord,
    durationBars: resizeState.value?.previewDurationBars ?? props.chord.durationBars
  }))

  const theme = computed(() => FUNCTION_THEME[props.chordFunction])

  const blockStyle = computed(() => {
    const { left, width } = calculateBlockGeometry(
      props.chord.startBar,
      displayChord.value.durationBars,
      props.barWidth
    )
    return { left: `${left}px`, width: `${width}px` }
  })

  const density = computed(() => blockDensity(displayChord.value.durationBars * props.barWidth))
</script>
