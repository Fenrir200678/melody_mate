<template>
  <button
    type="button"
    draggable="true"
    class="group rounded-control relative flex cursor-pointer flex-col px-1.5 py-1 text-left transition-all"
    :class="[theme.card, selected ? 'ring-daw-chord ring-1 ring-inset' : '']"
    :aria-pressed="selected"
    title="Click to select & audition · Double-click or + to insert · Drag to timeline"
    @dragstart="startChordPaletteDrag($event, chord, mode)"
    @pointerenter="emit('hover', chord)"
    @click="emit('pick', chord)"
    @dblclick="emit('insert', chord)"
  >
    <div class="flex w-full items-baseline justify-between gap-1 leading-none">
      <div class="flex items-baseline gap-1 truncate">
        <span class="text-2xs font-mono font-bold" :class="theme.roman">
          {{ chordRomanFor(chord, mode) }}
        </span>
        <span class="text-daw-text text-2xs truncate font-semibold">
          {{ chordNameFor(chord, mode) }}
        </span>
      </div>
      <div class="flex shrink-0 items-center gap-0.5">
        <span
          class="rounded-chip text-micro p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
          :class="theme.insert"
          title="Insert into next free slot"
          @click.stop="emit('insert', chord)"
        >
          <Plus class="h-2.5 w-2.5" />
        </span>
        <span class="rounded-chip text-micro py-0.2 px-1 font-mono leading-none" :class="theme.badge">
          {{ chord.degree }}
        </span>
      </div>
    </div>

    <span class="text-daw-text-muted text-micro mt-0.5 truncate font-mono leading-none">
      {{ chordNotesFor(chord, mode).join(' ') }}
    </span>
  </button>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { startChordPaletteDrag } from '@/utils/harmony/chordPaletteDrag'
  import { Plus } from '@lucide/vue'
  import {
    chordNameFor,
    chordNotesFor,
    chordRomanFor,
    type ChordMode,
    type DiatonicChord
  } from '@/core/theory/chord.engine'
  import type { PaletteClickMode } from '@/stores/harmony.store'
  import { PALETTE_CARD_THEME, paletteToneOf } from '@/utils/harmony/chordFunctionTheme'

  const props = withDefaults(
    defineProps<{
      chord: DiatonicChord
      mode: ChordMode
      clickMode?: PaletteClickMode
      selected?: boolean
    }>(),
    {
      clickMode: 'preview',
      selected: false
    }
  )

  const emit = defineEmits<{
    hover: [chord: DiatonicChord]
    pick: [chord: DiatonicChord]
    insert: [chord: DiatonicChord]
  }>()

  const theme = computed(() => PALETTE_CARD_THEME[paletteToneOf(props.chord)])
</script>
