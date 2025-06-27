<script setup lang="ts">
import { ref } from 'vue'
import { useGenerationStore } from '@/stores/generation.store'
import SelectButton from 'primevue/selectbutton'
import Checkbox from 'primevue/checkbox'

const nGramLengthOptions = ref(['1', '2', '3', '4'])

const generationStore = useGenerationStore()

function handleNGramLengthChange(val: string) {
  generationStore.setNGramLength(Number(val))
}

function handleUseNGramsChange(val: boolean) {
  generationStore.setUseNGrams(val)
  if (val) {
    generationStore.setUseMotifRepetition(false)
  }
}
</script>
<template>
  <div class="flex items-center justify-between">
    <div class="flex flex-col flex-1 min-w-0">
      <label for="n-grams" class="font-medium">
        Use N-Grams
        <p class="text-xs break-words">
          <a
            class="text-emerald-400 underline hover:no-underline"
            href="https://en.wikipedia.org/wiki/N-gram"
            target="_blank"
            >Alternative algorithm
          </a>
          for structured melodies (can't be used with Motif Repetition).
        </p>
      </label>
    </div>
    <Checkbox
      :model-value="generationStore.useNGrams"
      :binary="true"
      inputId="n-grams"
      @update:modelValue="handleUseNGramsChange"
    />
  </div>

  <!-- N-Gram Context Length -->
  <div v-if="generationStore.useNGrams">
    <div class="flex items-center justify-between gap-4">
      <div class="flex flex-col flex-1 min-w-0">
        <label for="n-gram-context-length" class="font-medium">N-Gram Context Length</label>
      </div>
      <div class="flex-shrink-0">
        <SelectButton
          :options="nGramLengthOptions"
          :model-value="generationStore.nGramLength?.toString() || '2'"
          @update:modelValue="handleNGramLengthChange"
        />
      </div>
    </div>
    <p class="text-xs mt-2">
      Higher values make the melody more idiomatic and less random. However, too large n values can also lead to the
      melody becoming too rigid. Usually, 2-3 works well. But it depends on the rhythm and the rest probability and you
      might get happy accidents with 1 or 4.
    </p>
  </div>
</template>
