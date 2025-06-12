<script setup lang="ts">
import MelodyGenerator from '@/components/MelodyGenerator.vue'
import MelodyVisualizer from '@/components/MelodyVisualizer.vue'
import MelodyPlayer from '@/components/MelodyPlayer.vue'
import AppSettings from '@/components/AppSettings.vue'
</script>

<template>
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
</template>
