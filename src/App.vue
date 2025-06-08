<script setup lang="ts">
import ScaleSelector from './components/ScaleSelector.vue'
import KeySelector from './components/KeySelector.vue'
import RhythmEditor from './components/RhythmEditor.vue'
import LengthSelector from './components/LengthSelector.vue'
import BpmSelector from './components/BpmSelector.vue'
import MelodyGenerator from './components/MelodyGenerator.vue'
import MelodyVisualizer from './components/MelodyVisualizer.vue'
import Controls from './components/Controls.vue'
import useMusicStore from './stores/music.store'

import Card from 'primevue/card'
import Checkbox from 'primevue/checkbox'

const store = useMusicStore()
</script>

<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-900 text-surface-700 dark:text-surface-0/80 p-4 md:p-8">
    <div class="max-w-6xl mx-auto">
      <header class="text-center mb-8">
        <h1 class="text-4xl md:text-5xl font-bold text-primary-500 dark:text-primary-400">Melody Mate</h1>
        <p class="text-lg mt-2">Create rule-based melodies and export them as MIDI files.</p>
      </header>

      <main>
        <Card class="mb-8">
          <template #title>
            <div class="flex items-center justify-center gap-2">
              <i class="pi pi-cog text-2xl"></i>
              <span>Settings</span>
            </div>
          </template>
          <template #content>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-x-8 gap-y-4 p-4">
              <div class="flex flex-col items-center gap-2">
                <label class="font-bold text-sm">Key</label>
                <KeySelector />
              </div>
              <div class="flex flex-col items-center gap-2">
                <label class="font-bold text-sm">Scale</label>
                <ScaleSelector />
              </div>
              <div class="flex flex-col items-center gap-2">
                <label class="font-bold text-sm">Rhythm</label>
                <RhythmEditor />
              </div>
              <div class="flex flex-col items-center gap-2">
                <label class="font-bold text-sm">Bars</label>
                <LengthSelector />
              </div>
              <div class="flex flex-col items-center gap-2">
                <label class="font-bold text-sm">BPM</label>
                <BpmSelector />
              </div>
              <div class="flex flex-col items-center justify-center gap-2">
                <label for="motif-repetition" class="font-bold text-sm">Motif Repetition</label>
                <Checkbox
                  v-model="store.useMotifRepetition"
                  :binary="true"
                  inputId="motif-repetition"
                  @update:modelValue="store.setUseMotifRepetition"
                />
              </div>
            </div>
          </template>
        </Card>

        <div class="mb-8">
          <MelodyGenerator />
        </div>

        <div class="mb-8">
          <MelodyVisualizer />
        </div>

        <div class="mb-8">
          <Controls />
        </div>
      </main>

      <footer class="text-center mt-8 text-sm">
        <p>
          v1.0.0 beta &copy; 2025
          <a
            class="text-primary-500 dark:text-primary-400 hover:underline"
            href="https://github.com/fenrir200678"
            target="_blank"
          >
            Fenrir
          </a>
        </p>
      </footer>
    </div>
  </div>
</template>
