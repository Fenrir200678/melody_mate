<script setup lang="ts">
import { ref } from 'vue'
import useMusicStore from '@/stores/music.store'
import { getAvailableKeys } from '@/services/ScaleService'
import SelectButton from 'primevue/selectbutton'

const store = useMusicStore()
const availableKeys = ref<{ name: string; value: string }[]>(getAvailableKeys())
const selectedKey = ref<string | null>(store.key)
const splitKeys = computed(() => {
  const keys_1 = []
  const keys_2 = []
  for (let i = 0; i < availableKeys.value.length; i++) {
    if (i < 6) {
      keys_1.push(availableKeys.value[i])
    } else {
      keys_2.push(availableKeys.value[i])
    }
  }
  return { keys_1, keys_2 }
})

function onKeyChange(value: string) {
  if (value) {
    selectedKey.value = value
    store.setKey(value)
  }
}
</script>

<template>
  <div class="flex flex-col gap-1 justify-center items-center">
    <SelectButton
      v-model="selectedKey"
      :options="splitKeys.keys_1"
      size="small"
      optionLabel="name"
      optionValue="value"
      @update:modelValue="onKeyChange"
      class="w-full lg:w-auto whitespace-nowrap flex-wrap"
    />
    <SelectButton
      v-model="selectedKey"
      :options="splitKeys.keys_2"
      size="small"
      optionLabel="name"
      optionValue="value"
      @update:modelValue="onKeyChange"
      class="w-full lg:w-auto whitespace-nowrap flex-wrap"
    />
  </div>
</template>
