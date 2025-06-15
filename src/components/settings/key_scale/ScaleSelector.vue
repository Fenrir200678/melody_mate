<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Select from 'primevue/select'
import { useCompositionStore } from '@/stores/composition.store'
import { getAvailableScaleNames } from '@/services/ScaleService'

const compositionStore = useCompositionStore()
const availableScaleNames = ref<string[]>([])

onMounted(() => {
  availableScaleNames.value = getAvailableScaleNames()
})
</script>

<template>
  <Select
    class="w-[50%]"
    :modelValue="compositionStore.scaleName"
    :options="availableScaleNames"
    placeholder="Select a Scale"
    height="3rem"
    filter
    @update:modelValue="compositionStore.setScaleName"
  />
</template>
