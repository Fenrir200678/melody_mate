<script setup lang="ts">
import { version } from '../../../package.json'
</script>
<template>
  <footer class="text-center mt-8 mb-12 text-sm">
    <p>&copy; {{ new Date().getFullYear() }} | Melody Mate v{{ version }}</p>
    <p>
      Developed with ❤️ by
      <a class="text-zinc-400 hover:underline" href="https://github.com/fenrir200678" target="_blank"> Fenrir </a>
    </p>
  </footer>
</template>
