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
  <footer class="w-full mt-8 mb-2 text-xs md:text-sm">
    <div class="max-w-[1920px] mx-auto px-3 md:px-4">
      <div
        class="flex flex-col md:flex-row items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3"
      >
        <!-- Left: version and author -->
        <div class="flex items-center gap-2 text-zinc-400">
          <span>© {{ new Date().getFullYear() }}</span>
          <span class="hidden md:inline">·</span>
          <span>v{{ version }}</span>
          <span class="hidden md:inline">·</span>
          <a class="hover:underline" href="https://github.com/fenrir200678" target="_blank">Fenrir</a>
        </div>

        <!-- Middle: links -->
        <div class="flex items-center gap-4">
          <a
            href="https://github.com/Fenrir200678/melody_mate/blob/main/DOCS.md"
            target="_blank"
            class="flex items-center gap-1 text-zinc-300 hover:text-white"
          >
            <i class="pi pi-book"></i>
            <span class="hidden sm:inline">Docs</span>
          </a>
          <a
            href="https://github.com/Fenrir200678/melody_mate"
            target="_blank"
            class="flex items-center gap-1 text-zinc-300 hover:text-white"
          >
            <i class="pi pi-github"></i>
            <span class="hidden sm:inline">GitHub</span>
          </a>
          <a
            href="https://github.com/Fenrir200678/melody_mate/issues"
            target="_blank"
            class="flex items-center gap-1 text-zinc-300 hover:text-white"
          >
            <i class="pi pi-comments"></i>
            <span class="hidden sm:inline">Feedback</span>
          </a>
        </div>

        <!-- Right: reset button -->
        <div>
          <button
            @click="clearSettings"
            class="flex items-center gap-2 px-3 py-1.5 rounded bg-red-600 text-white font-medium shadow hover:bg-red-700 transition-colors border-none outline-none focus:ring-2 focus:ring-red-400"
          >
            <i class="pi pi-trash"></i>
            <span>Clear Settings</span>
          </button>
        </div>
      </div>
      <div class="text-center text-zinc-500 mt-2">Non-Commercial License</div>
    </div>
  </footer>
</template>
