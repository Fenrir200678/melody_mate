<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Select from 'primevue/select'
import useMusicStore from '@/stores/music.store'
import { getAvailableKeys } from '@/services/ScaleService'

const store = useMusicStore()
const availableKeys = ref<string[]>([])
const selectedKey = ref<string | null>(null)

onMounted(() => {
  availableKeys.value = getAvailableKeys()

  // Set a default key on mount from the store
  const defaultKey = store.key
  selectedKey.value = defaultKey
  store.setKey(defaultKey)
})

function onKeyChange(value: string) {
  if (value) {
    selectedKey.value = value
    store.setKey(value)
  }
}
</script>

<template>
  <div class="flex justify-center">
    <Select
      v-model="selectedKey"
      :options="availableKeys"
      placeholder="Select a Key"
      @update:modelValue="onKeyChange"
    />
  </div>
</template>
