<script setup lang="ts">
import { computed, ref } from 'vue'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import useMusicStore from '@/stores/music.store'
import { motifs } from '@/data/motifs'
import type { Motif } from '@/ts/models'
import Divider from 'primevue/divider'

const store = useMusicStore()
const currentMotif = ref<Motif | null>(null)
const disabledClass = computed(() =>
  store.useNGrams || store.isEuclideanRhythm || store.bars < 4 ? 'text-zinc-500' : ''
)
const nGramLengthOptions = ref(['1', '2', '3', '4'])

function handleUseNGramsChange(val: boolean) {
  store.setUseNGrams(val)
  if (val) {
    store.setUseMotifRepetition(false)
  }
}

function handleNGramLengthChange(val: string) {
  store.setNGramLength(Number(val))
}

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
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4">
      <div class="flex flex-col flex-1 min-w-0" :class="disabledClass">
        <label for="motif-repetition" class="font-medium"> Motif Repetition </label>
        <span class="text-xs break-words"> Tries to repeat melodic motifs if you have selected at least 4 bars. </span>
      </div>
      <Checkbox
        v-model="store.useMotifRepetition"
        :binary="true"
        inputId="motif-repetition"
        @update:modelValue="store.setUseMotifRepetition"
        :disabled="store.useNGrams || store.isEuclideanRhythm || store.bars < 4"
      />
    </div>

    <div class="flex items-start justify-between gap-4">
      <div class="flex flex-col flex-1 min-w-0">
        <label for="n-grams" class="font-medium"> Use N-Grams </label>
        <span class="text-xs break-words">
          Advanced algorithm for structured melodies (can't be used with Motif Repetition)</span
        >
      </div>
      <div class="flex-shrink-0 mt-1">
        <Checkbox
          :model-value="store.useNGrams"
          :binary="true"
          inputId="n-grams"
          @update:modelValue="handleUseNGramsChange"
        />
      </div>
    </div>

    <!-- N-Gram Slider -->
    <div v-if="store.useNGrams">
      <div class="flex items-center justify-between gap-4">
        <div class="flex flex-col flex-1 min-w-0">
          <span class="font-medium">N-Gram Context Length</span>
        </div>
        <div class="flex-shrink-0 mt-1">
          <SelectButton
            :options="nGramLengthOptions"
            :model-value="store.nGramLength.toString()"
            @update:modelValue="handleNGramLengthChange"
          />
        </div>
      </div>
      <span class="text-xs"
        >N-Gram Context Length: Higher values make the melody more idiomatic and less random. However, too large n
        values can also lead to the melody becoming too rigid. Usually, 2 is a good compromise.
      </span>
    </div>

    <Divider />

    <div class="flex items-start justify-between gap-4">
      <div class="flex flex-col flex-1 min-w-0">
        <label for="start-with-root-note" class="font-medium"> Start with root note </label>
        <span class="text-xs break-words"> Start the melody with the root note of the scale</span>
      </div>
      <div class="flex-shrink-0 mt-1">
        <Checkbox
          v-model="store.startWithRootNote"
          :binary="true"
          inputId="start-with-root-note"
          @update:modelValue="store.setStartWithRootNote"
        />
      </div>
    </div>

    <!-- Neue Optionen für Motif-Training und Seed -->
    <div class="flex items-start justify-between gap-4">
      <div class="flex flex-col flex-1 min-w-0">
        <label for="use-motif-training-data" class="font-medium"> Use Pre-defined Motifs </label>
        <span class="text-xs">
          Tries to implement pre-defined motifs into the melody (currently only a few are available, more will be added
          in the future).
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
  </div>
</template>
