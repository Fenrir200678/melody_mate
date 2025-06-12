<script setup lang="ts">
import { ref } from 'vue'
import useMusicStore from '@/stores/music.store'
import { getAvailableKeys } from '@/services/ScaleService'
import Button from 'primevue/button'

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
