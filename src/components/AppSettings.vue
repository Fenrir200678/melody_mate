<script setup lang="ts">
import { ref } from 'vue'
import Divider from 'primevue/divider'
import ToggleSwitch from 'primevue/toggleswitch'
import Panel from 'primevue/panel'
import { useChordStore } from '@/stores/chord.store'
import { useRhythmStore } from '@/stores/rhythm.store'
import { storeToRefs } from 'pinia'

import KeySelector from '@/components/settings/key_scale/KeySelector.vue'
import ScaleSelector from '@/components/settings/key_scale/ScaleSelector.vue'
import LengthSelector from '@/components/settings/composition/LengthSelector.vue'
import BpmSelector from '@/components/settings/composition/BpmSelector.vue'
import OctaveSelector from '@/components/settings/composition/OctaveSelector.vue'
import VelocitySelector from '@/components/settings/composition/VelocitySelector.vue'
import RestProbabilitySelector from '@/components/settings/generation/RestProbabilitySelector.vue'
import RhythmicLicksSelector from '@/components/settings/generation/RhythmicLicksSelector.vue'
import CallAndResponse from '@/components/settings/generation/CallAndResponse.vue'
import MotifRepetition from '@/components/settings/generation/MotifRepetition.vue'
import StartWithRootNote from '@/components/settings/generation/StartWithRootNote.vue'
import EndWithRootNote from '@/components/settings/generation/EndWithRootNote.vue'
import ChordProgressionBuilder from '@/components/settings/chords/ChordProgressionBuilder.vue'
import ChordAdherenceSelector from '@/components/settings/chords/ChordAdherenceSelector.vue'
import RhythmControl from '@/components/settings/rhythm/RhythmControl.vue'
import AdvancedMusicalRules from '@/components/settings/generation/AdvancedMusicalRules.vue'

const chordStore = useChordStore()
const rhythmStore = useRhythmStore()
const { useCustomRhythm, isPresetRhythm } = storeToRefs(rhythmStore)

const keyScaleCollapsed = ref(false)
const harmonyCollapsed = ref(true)
const compositionCollapsed = ref(true)
const rhythmCollapsed = ref(true)
const motifContourCollapsed = ref(true)
const startEndCollapsed = ref(true)
const advancedRulesCollapsed = ref(true)
</script>
<template>
  <div id="app-settings" class="space-y-4 w-full max-w-full">
    <!-- Key & Scale -->
    <Panel v-model:collapsed="keyScaleCollapsed">
      <template #header>
        <div class="flex items-center gap-2 cursor-pointer w-full" @click="keyScaleCollapsed = !keyScaleCollapsed">
          <i class="pi pi-headphones text-sm"></i>
          <h3 class="text-lg font-semibold">Key & Scale</h3>
          <i class="pi pi-chevron-down text-sm ml-auto" :class="{ 'rotate-180': !keyScaleCollapsed }"></i>
        </div>
      </template>
      <div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <label class="font-medium block md:w-1/4 text-center md:text-left w-full">Key</label>
        <KeySelector />
      </div>

      <div class="flex items-center justify-between gap-4">
        <label class="font-medium">Scale</label>
        <ScaleSelector />
      </div>
    </Panel>

    <!-- Harmony -->
    <Panel v-model:collapsed="harmonyCollapsed">
      <template #header>
        <div class="flex items-center gap-2 cursor-pointer w-full" @click="harmonyCollapsed = !harmonyCollapsed">
          <i class="pi pi-sitemap text-sm"></i>
          <h3 class="text-lg font-semibold">Harmony & Chords</h3>
          <i class="pi pi-chevron-down text-sm ml-auto" :class="{ 'rotate-180': !harmonyCollapsed }"></i>
        </div>
      </template>
      <div class="space-y-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex flex-col flex-1 min-w-0">
            <label for="use-chords-switch" class="font-medium">Use Chord Progression Guidance</label>
            <span class="text-xs break-words">
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
    </Panel>

    <!-- Rhythm -->
    <Panel v-model:collapsed="rhythmCollapsed">
      <template #header>
        <div class="flex items-center gap-2 cursor-pointer w-full" @click="rhythmCollapsed = !rhythmCollapsed">
          <i class="pi pi-sliders-h text-sm"></i>
          <h3 class="text-lg font-semibold">Rhythm</h3>
          <i class="pi pi-chevron-down text-sm ml-auto" :class="{ 'rotate-180': !rhythmCollapsed }"></i>
        </div>
      </template>

      <RhythmControl :disabled="useCustomRhythm" />
      <RestProbabilitySelector v-if="isPresetRhythm" />
      <Divider v-if="isPresetRhythm" />
      <RhythmicLicksSelector v-if="isPresetRhythm" />
    </Panel>

    <!-- Composition -->
    <Panel v-model:collapsed="compositionCollapsed">
      <template #header>
        <div
          class="flex items-center gap-2 cursor-pointer w-full"
          @click="compositionCollapsed = !compositionCollapsed"
        >
          <i class="pi pi-file-edit text-sm"></i>
          <h3 class="text-lg font-semibold">Composition, Octave & Velocity</h3>
          <i class="pi pi-chevron-down text-sm ml-auto" :class="{ 'rotate-180': !compositionCollapsed }"></i>
        </div>
      </template>
      <div class="space-y-4">
        <LengthSelector />
        <!-- BPM and Octave -->
        <div class="flex items-center justify-between gap-4">
          <BpmSelector />
          <OctaveSelector />
        </div>
        <VelocitySelector />
      </div>
    </Panel>

    <!-- Motif -->
    <Panel v-model:collapsed="motifContourCollapsed">
      <template #header>
        <div
          class="flex items-center gap-2 cursor-pointer w-full"
          @click="motifContourCollapsed = !motifContourCollapsed"
        >
          <i class="pi pi-share-alt text-sm"></i>
          <h3 class="text-lg font-semibold">Motif</h3>
          <i class="pi pi-chevron-down text-sm ml-auto" :class="{ 'rotate-180': !motifContourCollapsed }"></i>
        </div>
      </template>
      <MotifRepetition />
      <Divider />
      <CallAndResponse />
    </Panel>

    <!-- Start/End Notes -->
    <Panel v-model:collapsed="startEndCollapsed">
      <template #header>
        <div class="flex items-center gap-2 cursor-pointer w-full" @click="startEndCollapsed = !startEndCollapsed">
          <i class="pi pi-step-forward text-sm"></i>
          <h3 class="text-lg font-semibold">Start/End Notes</h3>
          <i class="pi pi-chevron-down text-sm ml-auto" :class="{ 'rotate-180': !startEndCollapsed }"></i>
        </div>
      </template>
      <InfoBox
        class="mb-4"
        description="The melody can start and end with the root note of the key. 
      Disabled if you use chord progression guidance 
      (which forces the melody to follow the chord progression, so it makes no sense to force it to start and end with the root note)."
      />
      <StartWithRootNote :disabled="!!chordStore.useChords" />
      <EndWithRootNote :disabled="!!chordStore.useChords" />
    </Panel>

    <!-- Advanced Musical Rules -->
    <Panel v-model:collapsed="advancedRulesCollapsed">
      <template #header>
        <div
          class="flex items-center gap-2 cursor-pointer w-full"
          @click="advancedRulesCollapsed = !advancedRulesCollapsed"
        >
          <i class="pi pi-cog text-sm"></i>
          <h3 class="text-lg font-semibold">Advanced Settings</h3>
          <i class="pi pi-chevron-down text-sm ml-auto" :class="{ 'rotate-180': !advancedRulesCollapsed }"></i>
        </div>
      </template>
      <AdvancedMusicalRules />
    </Panel>
  </div>
</template>
