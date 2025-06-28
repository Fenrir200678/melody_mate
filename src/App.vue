<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import Toast from 'primevue/toast'
</script>

<template>
  <Analytics />
  <Toast />
  <PageHeader />
  <main
    class="w-full md:w-[95%] max-w-[1920px] mx-auto px-2 md:px-4 bg-gradient-to-br from-emerald-900/8 via-transparent to-blue-900/8"
  >
    <RouterView />
  </main>
  <PageFooter />
</template>
