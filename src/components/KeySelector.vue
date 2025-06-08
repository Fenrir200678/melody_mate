<script setup lang="ts">
import { ref, onMounted } from 'vue'
import useMusicStore from '@/stores/music.store'
import { getAvailableKeys } from '@/services/ScaleService'
import SelectButton from 'primevue/selectbutton'

const store = useMusicStore()
const availableKeys = ref<{ name: string; value: string }[]>(getAvailableKeys())
const selectedKey = ref<string | null>(null)

onMounted(() => {
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
  <SelectButton
    v-model="selectedKey"
    :options="availableKeys"
    optionLabel="name"
    optionValue="value"
    @update:modelValue="onKeyChange"
  />
</template>
