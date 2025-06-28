<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import Divider from 'primevue/divider'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

// Lazy load heavy components to improve initial bundle size
const MelodyGenerator = defineAsyncComponent({
  loader: () => import('@/components/MelodyGenerator.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200
})

const MelodyVisualizer = defineAsyncComponent({
  loader: () => import('@/components/MelodyVisualizer.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200
})

const MelodyPlayer = defineAsyncComponent({
  loader: () => import('@/components/MelodyPlayer.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200
})

const AppSettings = defineAsyncComponent({
  loader: () => import('@/components/AppSettings.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200
})
</script>

<template>
  <div class="flex flex-col gap-4 md:flex-row">
    <div class="w-full bg-zinc-900 rounded-lg px-4 py-8 md:w-[60%]">
      <AppSettings />
    </div>
    <div class="w-full bg-zinc-900 rounded-lg px-4 py-8 flex flex-col gap-8 md:w-[40%]">
      <MelodyVisualizer />
      <MelodyGenerator />
      <Divider />
      <MelodyPlayer />
    </div>
  </div>
</template>
