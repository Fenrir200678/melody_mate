<script setup lang="ts">
import SettingsMenu from './SettingsMenu.vue'
import { useUiStore } from '@/stores/ui.store'
import { useCompositionStore } from '@/stores/composition.store'

const ui = useUiStore()
const composition = useCompositionStore()
</script>

<template>
  <header class="fixed top-0 z-50 w-full">
    <!-- Top bar spanning full width with subtle gradient -->
    <div
      class="w-full bg-gradient-to-b from-zinc-900/95 to-zinc-900/90 supports-[backdrop-filter]:bg-zinc-900/75 backdrop-blur border-b border-zinc-800"
      style="height: var(--topbar-h)"
    >
      <div class="max-w-[1920px] mx-auto h-full px-3 md:px-4 flex items-center justify-between">
        <!-- Left: App logo + title -->
        <div class="flex items-center gap-2 md:gap-3">
          <img src="/logo.png" alt="Melody Mate" class="w-7 h-7 rounded-full" />
          <h1 class="text-lg md:text-xl font-semibold tracking-tight">Melody Mate</h1>
        </div>

        <!-- Right: quick info + links -->
        <div class="flex items-center gap-3 md:gap-4 text-sm">
          <!-- key/scale badges -->
          <div class="hidden sm:flex items-center gap-2 mr-2">
            <button
              class="px-2 py-0.5 rounded bg-zinc-800/70 border border-zinc-700 text-zinc-200 hover:text-white hover:border-zinc-500"
              @click="ui.navigateTo('key-scale', 'key-scale')"
            >
              Key: {{ composition.key }}
            </button>
            <button
              class="px-2 py-0.5 rounded bg-zinc-800/70 border border-zinc-700 text-zinc-200 hover:text-white hover:border-zinc-500"
              @click="ui.navigateTo('key-scale', 'key-scale')"
            >
              Scale: {{ composition.scaleName }}
            </button>
            <button
              class="px-2 py-0.5 rounded bg-zinc-800/70 border border-zinc-700 text-zinc-200 hover:text-white hover:border-zinc-500"
              @click="ui.navigateTo('composition', 'composition')"
            >
              Bars: {{ composition.bars }}
            </button>
          </div>
          <a
            href="https://github.com/Fenrir200678/melody_mate/blob/main/DOCS.md"
            target="_blank"
            class="flex items-center gap-1 text-zinc-300 hover:text-white"
          >
            <i class="pi pi-book text-base"></i>
            <span class="hidden sm:inline">Docs</span>
          </a>
          <a
            href="https://github.com/Fenrir200678/melody_mate"
            target="_blank"
            class="flex items-center gap-1 text-zinc-300 hover:text-white"
          >
            <i class="pi pi-github text-base"></i>
            <span class="hidden sm:inline">GitHub</span>
          </a>
          <a
            href="https://github.com/Fenrir200678/melody_mate/issues"
            target="_blank"
            class="flex items-center gap-1 text-zinc-300 hover:text-white"
          >
            <i class="pi pi-comments text-base"></i>
            <span class="hidden sm:inline">Feedback</span>
          </a>
        </div>
      </div>
    </div>

    <!-- Integrated settings menu under top bar, full width background -->
    <div
      class="w-full bg-gradient-to-b from-zinc-900/92 to-zinc-900/85 supports-[backdrop-filter]:bg-zinc-900/75 backdrop-blur border-b border-zinc-800"
    >
      <div class="max-w-[1920px] mx-auto">
        <SettingsMenu v-model="ui.selectedTab" />
      </div>
    </div>
  </header>
</template>
