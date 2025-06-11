<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue'
import MelodyGenerator from '@/components/MelodyGenerator.vue'
import MelodyVisualizer from '@/components/MelodyVisualizer.vue'
import MelodyPlayer from '@/components/MelodyPlayer.vue'

import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import AppSettings from '@/components/AppSettings.vue'
</script>

<template>
  <Analytics />
  <PageHeader />
  <main class="w-[90%] max-w-[1200px] mx-auto px-4">
    <div class="flex flex-col gap-4 md:flex-row">
      <div class="w-full bg-zinc-900 rounded-lg px-4 py-8 md:w-[60%]">
        <AppSettings />
      </div>
      <div class="w-full bg-zinc-900 rounded-lg px-4 py-8 flex flex-col gap-8 md:w-[40%]">
        <MelodyGenerator />
        <MelodyVisualizer />
        <MelodyPlayer />
      </div>
    </div>
  </main>
  <PageFooter />
</template>
