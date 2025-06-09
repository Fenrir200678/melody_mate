<script setup lang="ts">
import KeySelector from '@/components/settings/KeySelector.vue'
import ScaleSelector from '@/components/settings/ScaleSelector.vue'
import RhythmControl from '@/components/settings/RhythmControl.vue'
import LengthSelector from '@/components/settings/LengthSelector.vue'
import BpmSelector from '@/components/settings/BpmSelector.vue'
import OctaveSelector from '@/components/settings/OctaveSelector.vue'
import VelocitySelector from '@/components/settings/VelocitySelector.vue'
import GenerationOptions from '@/components/settings/GenerationOptions.vue'
</script>
<template>
  <div class="flex items-center gap-3 mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
    <i class="pi pi-cog text-2xl text-primary-500"></i>
    <span class="text-xl font-semibold">Settings</span>
  </div>

  <div class="space-y-4 w-full max-w-full">
    <!-- Key & Scale -->
    <h3 class="text-lg font-semibold mt-8 flex items-center gap-2">
      <i class="pi pi-headphones text-sm"></i>
      Key & Scale
    </h3>

    <div class="flex items-center justify-between gap-4">
      <label class="font-medium">Key</label>
      <KeySelector />
    </div>

    <div class="flex items-center justify-between gap-4">
      <label class="font-medium">Scale</label>
      <ScaleSelector />
    </div>

    <!-- Rhythm -->
    <div class="mt-8">
      <h3 class="text-lg font-semibold flex items-center gap-2">
        <i class="pi pi-clock text-sm"></i>
        Rhythm
      </h3>
      <RhythmControl />
    </div>

    <!-- Composition -->
    <div class="mt-4">
      <h3 class="text-lg font-semibold mb-2 flex items-center gap-2">
        <i class="pi pi-file-edit text-sm"></i>
        Composition
      </h3>
      <div class="space-y-4">
        <!-- Length (bars) -->
        <LengthSelector />

        <!-- BPM and Octave -->
        <div class="flex items-center justify-between gap-4">
          <label class="font-medium">BPM</label>
          <BpmSelector />
          <label class="font-medium">Octave</label>
          <OctaveSelector />
        </div>
      </div>
    </div>

    <!-- Generation Options -->
    <div class="mt-8">
      <h3 class="text-lg font-semibold mb-2 flex items-center gap-2">
        <i class="pi pi-cog text-sm"></i>
        Generation Options
      </h3>
      <GenerationOptions />
    </div>

    <!-- Playback Options -->
    <div class="mt-8">
      <h3 class="text-lg font-semibold mb-2 flex items-center gap-2">
        <i class="pi pi-volume-up text-sm"></i>
        Playback Options
      </h3>
      <div class="flex items-center gap-4">
        <div class="flex flex-col flex-1 min-w-0">
          <label for="fixed-velocity-switch" class="font-medium"> Use Fixed Velocity </label>
          <span class="text-xs break-words"> All notes with same velocity (1-127) </span>
        </div>
        <VelocitySelector />
      </div>
    </div>
  </div>
</template>
