<script setup lang="ts">
import { version } from '../../../package.json'

function clearSettings() {
  if (
    confirm('Are you sure you want to clear all saved settings? This will remove your preferences and reload the app.')
  ) {
    localStorage.clear()
    location.reload()
  }
}
</script>
<template>
  <footer class="text-center mt-8 mb-12 text-sm w-full flex flex-col items-center gap-2">
    <div class="mb-1">
      <p>&copy; {{ new Date().getFullYear() }} | Melody Mate v{{ version }}</p>
      <p>
        Developed with ❤️ by
        <a class="text-zinc-400 hover:underline" href="https://github.com/fenrir200678" target="_blank"> Fenrir </a>
      </p>
    </div>
    <div class="flex flex-col md:flex-row items-center justify-center gap-3 mt-1">
      <a
        href="https://github.com/Fenrir200678/melody_mate/blob/main/DOCS.md"
        target="_blank"
        class="flex items-center gap-1 text-blue-300 hover:text-blue-400 transition-colors"
      >
        <i class="pi pi-book"></i>
        Documentation
      </a>
      <a
        href="https://github.com/Fenrir200678/melody_mate"
        target="_blank"
        class="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
      >
        <i class="pi pi-github"></i>
        GitHub
      </a>
      <a
        href="https://github.com/Fenrir200678/melody_mate/issues"
        target="_blank"
        class="flex items-center gap-1 text-emerald-400 hover:text-emerald-500 transition-colors"
      >
        <i class="pi pi-comments"></i>
        Feedback / Report Bug
      </a>
    </div>
    <button
      @click="clearSettings"
      class="flex items-center gap-2 mt-4 px-4 py-2 rounded bg-red-600 text-white font-semibold shadow hover:bg-red-700 transition-colors border-none outline-none focus:ring-2 focus:ring-red-400"
    >
      <i class="pi pi-trash"></i>
      Clear Settings
    </button>
    <p class="text-xs text-red-400 mt-1 max-w-xs">
      Tip: If you experience issues or after a new version release, clearing your settings can help!
    </p>
    <p class="text-xs text-zinc-400 mt-2">Non-Commercial License. All rights reserved.</p>
  </footer>
</template>
