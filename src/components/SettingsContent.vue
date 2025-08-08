<script setup lang="ts">
import { computed } from 'vue'
import Divider from 'primevue/divider'
import InfoBox from '@/components/common/InfoBox.vue'

// Key & Scale
import KeySelector from '@/components/settings/key_scale/KeySelector.vue'
import ScaleSelector from '@/components/settings/key_scale/ScaleSelector.vue'

// Harmony
import { useChordStore } from '@/stores/chord.store'
import ChordProgressionBuilder from '@/components/settings/chords/ChordProgressionBuilder.vue'
import ChordAdherenceSelector from '@/components/settings/chords/ChordAdherenceSelector.vue'
import ToggleSwitch from 'primevue/toggleswitch'

// Rhythm
import { useRhythmStore } from '@/stores/rhythm.store'
import RhythmControl from '@/components/settings/rhythm/RhythmControl.vue'
import RestProbabilitySelector from '@/components/settings/generation/RestProbabilitySelector.vue'
import RhythmicLicksSelector from '@/components/settings/generation/RhythmicLicksSelector.vue'
import { storeToRefs } from 'pinia'

// Composition
import LengthSelector from '@/components/settings/composition/LengthSelector.vue'
import BpmSelector from '@/components/settings/composition/BpmSelector.vue'
import OctaveSelector from '@/components/settings/composition/OctaveSelector.vue'
import VelocitySelector from '@/components/settings/composition/VelocitySelector.vue'

// Motif
import CallAndResponse from '@/components/settings/generation/CallAndResponse.vue'
import MotifRepetition from '@/components/settings/generation/MotifRepetition.vue'

// Start/End Notes
import StartWithRootNote from '@/components/settings/generation/StartWithRootNote.vue'
import EndWithRootNote from '@/components/settings/generation/EndWithRootNote.vue'

// Advanced
import AdvancedMusicalRules from '@/components/settings/generation/AdvancedMusicalRules.vue'

type SettingsTab = 'key-scale' | 'harmony' | 'rhythm' | 'composition' | 'motif' | 'start-end' | 'advanced'

const props = defineProps<{ active: SettingsTab }>()
// expose heading ref for parent scrolling
const advancedHeadingEl = defineModel<HTMLElement | null>('advancedHeadingEl', { default: null })
const keyScaleHeadingEl = defineModel<HTMLElement | null>('keyScaleHeadingEl', { default: null })
const compositionHeadingEl = defineModel<HTMLElement | null>('compositionHeadingEl', { default: null })
const rhythmHeadingEl = defineModel<HTMLElement | null>('rhythmHeadingEl', { default: null })

// stores
const chordStore = useChordStore()
const rhythmStore = useRhythmStore()
const { useCustomRhythm, isPresetRhythm } = storeToRefs(rhythmStore)

const isHarmony = computed(() => props.active === 'harmony')
const isRhythm = computed(() => props.active === 'rhythm')
const isKeyScale = computed(() => props.active === 'key-scale')
const isComposition = computed(() => props.active === 'composition')
const isMotif = computed(() => props.active === 'motif')
const isStartEnd = computed(() => props.active === 'start-end')
const isAdvanced = computed(() => props.active === 'advanced')
</script>

<template>
  <!-- Key & Scale -->
  <div v-if="isKeyScale" class="space-y-6">
    <div ref="keyScaleHeadingEl"></div>
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <label class="font-medium block md:w-1/4 text-center md:text-left w-full">Key</label>
      <KeySelector />
    </div>
    <div class="flex items-center justify-between gap-4">
      <label class="font-medium">Scale</label>
      <ScaleSelector />
    </div>
  </div>

  <!-- Harmony & Chords -->
  <div v-else-if="isHarmony" class="space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div class="flex flex-col flex-1 min-w-0">
        <label for="use-chords-switch" class="font-medium">Use Chord Progression Guidance</label>
        <span class="text-xs break-words text-zinc-300">
          Influence melody generation with chord progressions. Chords are not actually played, but the melody is
          generated based on the imaginary chord progression and attempts to orient itself to it.
        </span>
      </div>
      <ToggleSwitch
        :modelValue="chordStore.useChords"
        inputId="use-chords-switch"
        @update:modelValue="chordStore.setUseChords"
      />
    </div>
    <ChordProgressionBuilder :disabled="!chordStore.useChords" />
    <ChordAdherenceSelector :disabled="!chordStore.useChords" />
  </div>

  <!-- Rhythm -->
  <div v-else-if="isRhythm" class="space-y-6">
    <div ref="rhythmHeadingEl"></div>
    <RhythmControl :disabled="useCustomRhythm" />
    <div v-if="isPresetRhythm" class="space-y-6">
      <RestProbabilitySelector />
      <Divider />
      <RhythmicLicksSelector />
    </div>
  </div>

  <!-- Composition, Octave & Velocity -->
  <div v-else-if="isComposition" class="space-y-6">
    <div ref="compositionHeadingEl"></div>
    <LengthSelector />
    <div class="flex items-center justify-between gap-4">
      <BpmSelector />
      <OctaveSelector />
    </div>
    <VelocitySelector />
  </div>

  <!-- Motif -->
  <div v-else-if="isMotif" class="space-y-6">
    <MotifRepetition />
    <Divider />
    <CallAndResponse />
  </div>

  <!-- Start/End Notes -->
  <div v-else-if="isStartEnd" class="space-y-6">
    <InfoBox
      class="mb-2"
      description="The melody can start and end with the root note of the key. Disabled if you use chord progression guidance (which forces the melody to follow the chord progression, so it makes no sense to force it to start and end with the root note)."
    />
    <StartWithRootNote :disabled="!!chordStore.useChords" />
    <EndWithRootNote :disabled="!!chordStore.useChords" />
  </div>

  <!-- Advanced Settings -->
  <div v-else-if="isAdvanced">
    <div ref="advancedHeadingEl"></div>
    <AdvancedMusicalRules />
  </div>
</template>
