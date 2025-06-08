<script setup lang="ts">
import MelodyGenerator from '@/components/MelodyGenerator.vue'
import MelodyVisualizer from '@/components/MelodyVisualizer.vue'
import Controls from '@/components/Controls.vue'

import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import AppSettings from '@/components/AppSettings.vue'
</script>

<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-900 text-surface-700 dark:text-surface-0/80 w-[90%] mx-auto">
    <div class="w-full mx-auto">
      <main>
        <PageHeader />

        <div class="mb-8">
          <AppSettings />
        </div>

        <div class="mb-8">
          <MelodyGenerator />
        </div>

        <div class="mb-8">
          <MelodyVisualizer />
        </div>

        <div class="mb-8">
          <Controls />
        </div>
      </main>
      <PageFooter />
    </div>
  </div>
</template>
