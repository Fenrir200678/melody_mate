<script setup lang="ts">
import { ref } from 'vue'
import { useCompositionStore } from '@/stores/composition.store'
import { getAvailableKeys } from '@/services/ScaleService'
import Button from 'primevue/button'

const compositionStore = useCompositionStore()
const availableKeys = ref<{ name: string; value: string }[]>(getAvailableKeys())
const selectedKey = ref<string | null>(compositionStore.key)

function onKeyChange(value: string) {
  if (value) {
    selectedKey.value = value
    compositionStore.setKey(value)
  }
}
</script>

<template>
  <div class="flex items-start align gap-4 w-full justify-start flex-wrap mb-4">
    <div v-for="key in availableKeys" :key="key.value">
      <Button
        :label="key.name"
        @click="onKeyChange(key.value)"
        class="w-20"
        size="small"
        :severity="selectedKey === key.value ? 'primary' : 'secondary'"
      />
    </div>
  </div>
</template>
