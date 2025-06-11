<script setup lang="ts">
import { ref } from 'vue'
import useMusicStore from '@/stores/music.store'
import { getAvailableKeys } from '@/services/ScaleService'
import SelectButton from 'primevue/selectbutton'

const store = useMusicStore()
const availableKeys = ref<{ name: string; value: string }[]>(getAvailableKeys())
const selectedKey = ref<string | null>(store.key)

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
    class="w-full lg:w-auto"
  />
</template>
