<script setup lang="ts">
import { computed } from 'vue'
import { useGenerationStore } from '@/stores/generation.store'
import { useCompositionStore } from '@/stores/composition.store'
import { MOTIF_PATTERNS } from '@/services/melody/motif.service'
import Checkbox from 'primevue/checkbox'
import Select from 'primevue/select'

const generationStore = useGenerationStore()
const compositionStore = useCompositionStore()

const motifPatterns = computed(() => {
  return MOTIF_PATTERNS.map((pattern) => ({
    label: pattern.replace(/([A-Z])/g, ' $1').trim(),
    value: pattern
  }))
})
const labelClass = computed(() => {
  return generationStore.useNGrams || compositionStore.bars < 4 ? 'text-zinc-500' : ''
})
const isDisabled = computed(() => {
  return generationStore.useNGrams || compositionStore.bars < 4
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-4">
      <div class="flex flex-col flex-1 min-w-0" :class="labelClass">
        <label for="motif-repetition" class="font-medium leading-tight">
          Motif Repetition<br />
          <span class="text-xs break-words"> Repeat melodic motifs if you have selected at least 4 bars. </span>
        </label>
      </div>
      <Checkbox
        v-model="generationStore.useMotifRepetition"
        :binary="true"
        inputId="motif-repetition"
        @update:modelValue="generationStore.setUseMotifRepetition"
        :disabled="isDisabled"
      />
    </div>
    <div class="flex items-center justify-between gap-4">
      <div class="flex flex-col flex-1 min-w-0" :class="labelClass">
        <label for="motif-repetition-pattern" class="font-medium"> Motif Repetition Pattern </label>
        <span class="text-xs break-words"> The pattern of motifs to repeat. </span>
      </div>
      <Select
        v-model="generationStore.motifRepetitionPattern"
        inputId="motif-repetition-pattern"
        :disabled="isDisabled || generationStore.useRandomMotifPattern"
        :options="motifPatterns"
        optionLabel="label"
        optionValue="value"
        @update:modelValue="generationStore.setMotifRepetitionPattern"
      />
    </div>
    <div class="flex items-center justify-between gap-4">
      <div class="flex flex-col flex-1 min-w-0" :class="labelClass">
        <label for="use-random-motif-pattern" class="font-medium leading-tight">
          Use Random Motif Pattern<br />
          <span class="text-xs break-words"> Use a random motif pattern instead of the selected one. </span>
        </label>
      </div>
      <Checkbox
        v-model="generationStore.useRandomMotifPattern"
        :binary="true"
        inputId="use-random-motif-pattern"
        @update:modelValue="generationStore.setUseRandomMotifPattern"
      />
    </div>
    <p class="text-sm text-zinc-300 leading-relaxed mt-2" v-if="!isDisabled">
      Not every motif pattern is suitable for every rhythm. You have to experiment with the different patterns to find
      the best one for your selected rhythm. Some rhythms even don't make sense at all with a motif pattern and give you
      better results with the N-Gram option.
    </p>
  </div>
</template>
