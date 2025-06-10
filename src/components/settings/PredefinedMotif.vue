<script setup lang="ts">
import { ref } from 'vue'
import useMusicStore from '@/stores/music.store'
import { motifs } from '@/data/motifs'
import type { Motif } from '@/ts/models'

import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'

const store = useMusicStore()

const currentMotif = ref<Motif | null>(null)

function randomMotif() {
  if (!store.seedWithMotif || motifs.length === 0) return
  currentMotif.value = motifs[Math.floor(Math.random() * motifs.length)]
  store.setSeedWithMotif(true)
}

function handleSeedWithMotifChange(val: boolean) {
  store.setSeedWithMotif(val)
  if (val) {
    randomMotif()
  }
}
</script>

<template>
  <div class="flex items-start justify-between gap-4">
    <div class="flex flex-col flex-1 min-w-0">
      <label for="use-motif-training-data" class="font-medium"> Use Pre-defined Motifs </label>
      <span class="text-xs">
        Tries to implement pre-defined motifs into the melody (currently only a few are available, more will be added in
        the future).
      </span>
    </div>
    <div class="flex-shrink-0 mt-1">
      <Checkbox
        v-model="store.useMotifTrainingData"
        :binary="true"
        inputId="use-motif-training-data"
        @update:modelValue="store.setUseMotifTrainingData"
      />
    </div>
  </div>

  <div class="flex items-start justify-between gap-4">
    <div class="flex flex-col flex-1 min-w-0">
      <label for="seed-with-motif" class="font-medium"> Seed Melody with Pre-defined Motif </label>
      <span class="text-xs break-words"> Tries to start the melody with a pre-defined motif</span>
    </div>
    <div class="flex-shrink-0 mt-1">
      <Checkbox
        v-model="store.seedWithMotif"
        :binary="true"
        inputId="seed-with-motif"
        @update:modelValue="handleSeedWithMotifChange"
      />
    </div>
  </div>

  <div v-if="store.seedWithMotif" class="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded">
    <p class="font-medium">{{ currentMotif?.name }}</p>
    <p class="text-sm">{{ currentMotif?.notes.join(' ') }}</p>
    <div class="flex justify-end mt-2">
      <Button label="Random Motif" icon="pi pi-refresh" size="small" @click="randomMotif" />
    </div>
  </div>
</template>
