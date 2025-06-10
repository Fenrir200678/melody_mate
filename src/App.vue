<script setup lang="ts">
import MelodyGenerator from '@/components/MelodyGenerator.vue'
import MelodyVisualizer from '@/components/MelodyVisualizer.vue'
import MelodyPlayer from '@/components/MelodyPlayer.vue'

import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import AppSettings from '@/components/AppSettings.vue'
</script>

<template>
  <PageHeader />
  <main class="w-[90%] max-w-[1200px] mx-auto px-4">
    <div class="flex gap-4">
      <div class="w-[60%] bg-zinc-900 rounded-lg px-4 py-8">
        <AppSettings />
      </div>
      <div class="w-[40%] bg-zinc-900 rounded-lg px-4 py-8 flex flex-col gap-8">
        <MelodyGenerator />
        <MelodyVisualizer />
        <MelodyPlayer />
      </div>
    </div>
  </main>
  <PageFooter />
</template>
