<template>
  <div class="flex h-full flex-col gap-1.5 overflow-y-auto p-2 select-none">
    <PaletteControls v-model="chordMode" />

    <!-- Functional groups, each rendered in the palette's ascending degree order -->
    <div class="flex flex-1 flex-col gap-1.5">
      <PaletteSection v-for="group in paletteGroups" :key="group.tone" :tone="group.tone">
        <PaletteChordCard
          v-for="chord in group.chords"
          :key="chord.degree"
          :chord="chord"
          :mode="chordMode"
          :selected="selectedDegree === chord.degree"
          @hover="setHoveredChord"
          @pick="onChordPick"
          @insert="insertChord"
        />
      </PaletteSection>
    </div>

    <div class="border-daw-border/60 border-t pt-1">
      <ChordStudioMiniKeyboard
        :active-voicing="currentVoicing"
        :root-pitch="currentRootPitch"
        :base-octave="harmonyStore.chordRegister"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import type { ChordEvent } from '@/core/schemas/chord.schema'
  import {
    buildChordVoicing,
    chordNameFor,
    chordNotesFor,
    type ChordMode,
    type DiatonicChord
  } from '@/core/theory/chord.engine'
  import { groupPaletteByFunction, type HarmonicFunction } from '@/core/theory/chord-function'
  import { optimizeProgressionVoiceLeading } from '@/core/theory/voice-leading'
  import { useChordInsertion } from '@/composables/harmony/useChordInsertion'
  import { DEFAULT_CHORD_PALETTE } from '@/config/ui-defaults'
  import { useAudioStore } from '@/stores/audio.store'
  import { useHarmonyStore } from '@/stores/harmony.store'
  import ChordStudioMiniKeyboard from './ChordStudioMiniKeyboard.vue'
  import PaletteChordCard from './palette/PaletteChordCard.vue'
  import PaletteControls from './palette/PaletteControls.vue'
  import PaletteSection from './palette/PaletteSection.vue'

  const harmonyStore = useHarmonyStore()
  const audioStore = useAudioStore()
  const { insertInNextFreeSlot } = useChordInsertion()

  const chordMode = defineModel<ChordMode>('chordMode', { default: DEFAULT_CHORD_PALETTE.mode })
  const selectedDegree = defineModel<number | null>('selectedDegree', { default: DEFAULT_CHORD_PALETTE.selectedDegree })

  const FUNCTION_ORDER: HarmonicFunction[] = ['tonic', 'subdominant', 'dominant']

  const paletteGroups = computed(() => {
    const grouped = groupPaletteByFunction(harmonyStore.diatonicPalette)
    return FUNCTION_ORDER.map((tone) => ({ tone, chords: grouped[tone] }))
  })

  const activeOrHoveredChord = ref<DiatonicChord | null>(null)

  function setHoveredChord(chord: DiatonicChord): void {
    activeOrHoveredChord.value = chord
  }

  const previewChord = computed<DiatonicChord | null>(
    () => activeOrHoveredChord.value ?? harmonyStore.diatonicPalette[0] ?? null
  )

  /** The keyboard previews the voicing as it would actually land, so auto-smooth re-voices it. */
  const currentVoicing = computed<string[]>(() => {
    const chord = previewChord.value
    if (!chord) return []

    const name = chordNameFor(chord, chordMode.value)
    const baseVoicing = buildChordVoicing(name, harmonyStore.chordRegister, 0, harmonyStore.voicingStyle)

    if (!harmonyStore.autoSmooth || harmonyStore.chords.length === 0) {
      return baseVoicing
    }

    const lastChord = harmonyStore.chords[harmonyStore.chords.length - 1]
    const candidate: ChordEvent = {
      id: 'candidate-preview',
      name,
      roman: '',
      notes: chordNotesFor(chord, chordMode.value),
      voicing: baseVoicing,
      startBar: 0,
      durationBars: 1,
      inversion: 0
    }
    const optimized = optimizeProgressionVoiceLeading([lastChord, candidate], harmonyStore.chordRegister)
    return optimized[1]?.voicing ?? baseVoicing
  })

  const currentRootPitch = computed(() => {
    const chord = previewChord.value
    if (!chord) return ''
    const notes = chordNotesFor(chord, chordMode.value)
    return notes[0] ? `${notes[0]}${harmonyStore.chordRegister}` : ''
  })

  function onChordPick(chord: DiatonicChord): void {
    selectedDegree.value = chord.degree
    activeOrHoveredChord.value = chord

    const name = chordNameFor(chord, chordMode.value)
    audioStore.auditionChord(buildChordVoicing(name, harmonyStore.chordRegister, 0, harmonyStore.voicingStyle))
  }

  function insertChord(chord: DiatonicChord): void {
    selectedDegree.value = chord.degree
    activeOrHoveredChord.value = chord
    insertInNextFreeSlot(chord, chordMode.value)
  }
</script>
