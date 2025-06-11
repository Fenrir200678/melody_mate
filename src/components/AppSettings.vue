<script setup lang="ts">
import Divider from 'primevue/divider'

import KeySelector from '@/components/settings/key_scale/KeySelector.vue'
import ScaleSelector from '@/components/settings/key_scale/ScaleSelector.vue'
import RhythmControl from '@/components/settings/rhythm/RhythmControl.vue'
import LengthSelector from '@/components/settings/composition/LengthSelector.vue'
import BpmSelector from '@/components/settings/composition/BpmSelector.vue'
import OctaveSelector from '@/components/settings/composition/OctaveSelector.vue'
import VelocitySelector from '@/components/settings/composition/VelocitySelector.vue'
import RestProbabilitySelector from '@/components/settings/generation/RestProbabilitySelector.vue'
import NGramSelector from '@/components/settings/generation/NGramSelector.vue'
import MotifRepetition from '@/components/settings/generation/MotifRepetition.vue'
import StartWithRootNote from '@/components/settings/generation/StartWithRootNote.vue'
import PredefinedMotif from '@/components/settings/generation/PredefinedMotif.vue'
</script>
<template>
  <div class="space-y-4 w-full max-w-full">
    <!-- Key & Scale -->
    <h3 class="text-lg font-semibold flex items-center gap-2">
      <i class="pi pi-headphones text-sm"></i>
      Key & Scale
    </h3>
    <Divider />

    <div class="flex items-center justify-between gap-4">
      <label class="font-medium">Key</label>
      <KeySelector />
    </div>

    <div class="flex items-center justify-between gap-4">
      <label class="font-medium">Scale</label>
      <ScaleSelector />
    </div>

    <!-- Composition -->
    <div class="mt-8">
      <h3 class="text-lg font-semibold flex items-center gap-2">
        <i class="pi pi-file-edit text-sm"></i>
        Composition
      </h3>
      <Divider />
      <div class="space-y-4">
        <LengthSelector />
        <!-- BPM and Octave -->
        <div class="flex items-center justify-between gap-4">
          <BpmSelector />
          <OctaveSelector />
        </div>
        <VelocitySelector />
      </div>
    </div>

    <!-- Rhythm -->
    <div class="mt-8">
      <RhythmControl />
    </div>

    <!-- Generation Options -->
    <div class="mt-4">
      <h3 class="text-lg font-semibold flex items-center gap-2">
        <i class="pi pi-cog text-sm"></i>
        Generation Options
      </h3>
      <p class="text-xs text-zinc-500 leading-relaxed mb-4">
        These options are used to control the generation of the melody. You can change them to your liking, but the
        default values are usually a good starting point. Melodies are generated using
        <a
          class="text-emerald-400 underline hover:no-underline"
          href="https://en.wikipedia.org/wiki/Markov_chain"
          target="_blank"
          >Markov Chain</a
        >
        algorithm if you don't choose the N-Gram option.
      </p>
      <Divider />
      <div class="space-y-4">
        <RestProbabilitySelector />
        <MotifRepetition />
        <NGramSelector />
        <Divider />
        <StartWithRootNote />
        <PredefinedMotif />
      </div>
    </div>
  </div>
</template>
