<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
</script>

<template>
  <Analytics />
  <PageHeader />
  <main class="w-full md:w-[90%] max-w-[1500px] mx-auto px-2 md:px-4">
    <RouterView />
  </main>
  <PageFooter />
</template>
