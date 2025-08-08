<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { useUiStore } from '@/stores/ui.store'

// Lazy load heavy components to improve initial bundle size
const MelodyVisualizer = defineAsyncComponent({
  loader: () => import('@/components/MelodyVisualizer.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200
})

const MelodyGenerator = defineAsyncComponent({
  loader: () => import('@/components/MelodyGenerator.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200
})

const MelodyPlayer = defineAsyncComponent({
  loader: () => import('@/components/MelodyPlayer.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200
})

const SettingsContent = defineAsyncComponent({
  loader: () => import('../components/SettingsContent.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200
})

const ui = useUiStore()
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Middle content area: Visualizer, Generate button, Player -->
    <section class="rounded-xl p-4 md:p-6 flex flex-col gap-4 spotlight my-4">
      <MelodyVisualizer />
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="md:col-span-1">
          <MelodyGenerator />
        </div>
        <div class="md:col-span-2">
          <MelodyPlayer />
        </div>
      </div>
    </section>

    <!-- Settings content below the player, driven by top menu tab selection -->
    <section class="bg-zinc-900 rounded-lg p-4 md:p-6">
      <SettingsContent :active="ui.selectedTab" />
    </section>
  </div>
</template>
