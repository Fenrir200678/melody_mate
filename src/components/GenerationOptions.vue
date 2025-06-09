<script setup lang="ts">
import Checkbox from 'primevue/checkbox'
import useMusicStore from '@/stores/music.store'

const store = useMusicStore()
</script>
<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4">
      <div class="flex flex-col flex-1 min-w-0">
        <label for="motif-repetition" class="font-medium"> Motif Repetition </label>
        <span class="text-xs break-words"> Repeats melodic motifs for more structure </span>
      </div>
      <Checkbox
        v-model="store.useMotifRepetition"
        :binary="true"
        inputId="motif-repetition"
        @update:modelValue="store.setUseMotifRepetition"
        :disabled="store.useNGrams"
      />
    </div>

    <div class="flex items-start justify-between gap-4">
      <div class="flex flex-col flex-1 min-w-0">
        <label for="n-grams" class="font-medium"> Use N-Grams </label>
        <span class="text-xs break-words"> Advanced algorithm for complex melodies </span>
      </div>
      <div class="flex-shrink-0 mt-1">
        <Checkbox v-model="store.useNGrams" :binary="true" inputId="n-grams" @update:modelValue="store.setUseNGrams" />
      </div>
    </div>
  </div>
</template>
