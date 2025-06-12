<script setup lang="ts">
import { ref } from 'vue'
import useMusicStore from '@/stores/music.store'
import SelectButton from 'primevue/selectbutton'
import Checkbox from 'primevue/checkbox'
import Divider from 'primevue/divider'

const nGramLengthOptions = ref(['1', '2', '3', '4'])

const store = useMusicStore()

function handleNGramLengthChange(val: string) {
  store.setNGramLength(Number(val))
}

function handleUseNGramsChange(val: boolean) {
  store.setUseNGrams(val)
  if (val) {
    store.setUseMotifRepetition(false)
  }
}
</script>
<template>
  <div class="flex items-center justify-between">
    <div class="flex flex-col flex-1 min-w-0">
      <label for="n-grams" class="font-medium"> Use N-Grams </label>
      <p class="text-xs break-words">
        <a
          class="text-emerald-400 underline hover:no-underline"
          href="https://en.wikipedia.org/wiki/N-gram"
          target="_blank"
          >Advanced algorithm
        </a>
        for structured melodies (can't be used with Motif Repetition).
      </p>
    </div>
    <Checkbox
      :model-value="store.useNGrams"
      :binary="true"
      inputId="n-grams"
      @update:modelValue="handleUseNGramsChange"
    />
  </div>

  <!-- N-Gram Context Length -->
  <div v-if="store.useNGrams">
    <div class="flex items-center justify-between gap-4">
      <div class="flex flex-col flex-1 min-w-0">
        <span class="font-medium">N-Gram Context Length</span>
      </div>
      <div class="flex-shrink-0">
        <SelectButton
          :options="nGramLengthOptions"
          :model-value="store.nGramLength.toString()"
          @update:modelValue="handleNGramLengthChange"
        />
      </div>
    </div>
    <p class="text-xs mt-2">
      Higher values make the melody more idiomatic and less random. However, too large n values can also lead to the
      melody becoming too rigid. Usually, 2 is a good compromise.
    </p>
    <Divider />
  </div>
</template>
