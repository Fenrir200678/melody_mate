<script setup lang="ts">
import { computed } from 'vue'
import Checkbox from 'primevue/checkbox'
import useMusicStore from '@/stores/music.store'

const store = useMusicStore()

const disabledClass = computed(() =>
  store.useNGrams || store.isEuclideanRhythm || store.bars < 4 ? 'text-zinc-500' : ''
)
</script>

<template>
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
</template>
