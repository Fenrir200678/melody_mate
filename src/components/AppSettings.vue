<script setup lang="ts">
import useMusicStore from '@/stores/music.store'

import KeySelector from '@/components/KeySelector.vue'
import ScaleSelector from '@/components/ScaleSelector.vue'
import RhythmControl from '@/components/RhythmControl.vue'
import LengthSelector from '@/components/LengthSelector.vue'
import BpmSelector from '@/components/BpmSelector.vue'
import OctaveSelector from '@/components/OctaveSelector.vue'

import Checkbox from 'primevue/checkbox'
import InputNumber from 'primevue/inputnumber'
import ToggleSwitch from 'primevue/toggleswitch'
import Divider from 'primevue/divider'

const store = useMusicStore()
</script>
<template>
  <div class="w-[50%] mx-auto mb-8 bg-zinc-900 rounded-lg p-4">
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
      <div class="mt-8">
        <h3 class="text-lg font-semibold mb-2 flex items-center gap-2">
          <i class="pi pi-file-edit text-sm"></i>
          Composition
        </h3>
        <div class="space-y-4">
          <!-- Bars - Full width on mobile -->
          <div class="flex items-center justify-between gap-4">
            <label class="font-medium">Length (bars)</label>
            <LengthSelector />
          </div>

          <!-- BPM and Octave in grid on larger screens -->
          <div class="flex items-center justify-between gap-4">
            <label class="font-medium">BPM</label>
            <BpmSelector />
            <label class="font-medium">Octave</label>
            <OctaveSelector />
          </div>
        </div>
      </div>

      <!-- Generation Options -->
      <div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 w-full max-w-full overflow-hidden">
        <h3 class="text-lg font-semibold mb-4 text-primary-700 dark:text-primary-300 flex items-center gap-2">
          <i class="pi pi-cog text-sm"></i>
          Generation Options
        </h3>
        <div class="space-y-3 w-full">
          <div class="flex items-start justify-between gap-4 py-2 min-w-0">
            <div class="flex flex-col flex-1 min-w-0">
              <label for="motif-repetition" class="font-medium text-surface-700 dark:text-surface-200">
                Motif Repetition
              </label>
              <span class="text-xs text-surface-500 dark:text-surface-400 break-words">
                Repeats melodic motifs for more structure
              </span>
            </div>
            <div class="flex-shrink-0 mt-1">
              <Checkbox
                v-model="store.useMotifRepetition"
                :binary="true"
                inputId="motif-repetition"
                @update:modelValue="store.setUseMotifRepetition"
                :disabled="store.useNGrams"
              />
            </div>
          </div>

          <Divider class="my-2" />

          <div class="flex items-start justify-between gap-4 py-2 min-w-0">
            <div class="flex flex-col flex-1 min-w-0">
              <label for="n-grams" class="font-medium text-surface-700 dark:text-surface-200"> Use N-Grams </label>
              <span class="text-xs text-surface-500 dark:text-surface-400 break-words">
                Advanced Markov chains for complex melodies
              </span>
            </div>
            <div class="flex-shrink-0 mt-1">
              <Checkbox
                v-model="store.useNGrams"
                :binary="true"
                inputId="n-grams"
                @update:modelValue="store.setUseNGrams"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Playback Options -->
      <div class="bg-surface-50 dark:bg-surface-800 rounded-lg p-4 w-full max-w-full overflow-hidden">
        <h3 class="text-lg font-semibold mb-4 text-primary-700 dark:text-primary-300 flex items-center gap-2">
          <i class="pi pi-volume-up text-sm"></i>
          Playback Options
        </h3>
        <div class="flex items-start justify-between gap-4 py-2 min-w-0">
          <div class="flex flex-col flex-1 min-w-0">
            <label for="fixed-velocity-switch" class="font-medium text-surface-700 dark:text-surface-200">
              Use Fixed Velocity
            </label>
            <span class="text-xs text-surface-500 dark:text-surface-400 break-words">
              All notes with same velocity (1-127)
            </span>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0">
            <ToggleSwitch
              v-model="store.useFixedVelocity"
              inputId="fixed-velocity-switch"
              @update:modelValue="store.setUseFixedVelocity"
            />
            <div class="w-24 max-w-24">
              <InputNumber
                v-model="store.fixedVelocity"
                :min="1"
                :max="127"
                :step="1"
                showButtons
                buttonLayout="horizontal"
                @update:modelValue="store.setFixedVelocity"
                inputId="velocity-input"
                class="w-full"
                :disabled="!store.useFixedVelocity"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
