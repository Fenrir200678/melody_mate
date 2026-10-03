<template>
  <div class="flex shrink-0 items-center gap-2 xl:gap-3">
    <!-- Toggle Left Sidebar Button -->
    <DawIconButton
      id="melody-panel-toggle"
      :icon="PanelLeft"
      size="md"
      appearance="panel"
      variant="signal"
      :active="uiStore.isLeftSidebarOpen"
      :aria-expanded="uiStore.isLeftSidebarOpen"
      aria-controls="daw-sidebar-left"
      title="Toggle melody generator (B)"
      aria-label="Toggle melody generator"
      @click="uiStore.toggleLeftSidebar()"
    />

    <!-- DAW Branding (Click to open About dialog) -->
    <button
      type="button"
      class="daw-header-brand hover:bg-daw-surface/50 rounded-control focus-visible:ring-daw-signal flex shrink-0 cursor-pointer items-center gap-2 p-1 text-left transition-colors focus:outline-none focus-visible:ring-1"
      title="About Melody Mate"
      aria-label="About Melody Mate"
      @click="uiStore.openAbout()"
    >
      <div
        class="rounded-control from-daw-signal to-daw-chord flex h-7 w-7 shrink-0 items-center justify-center bg-linear-to-br shadow-md"
      >
        <AudioWaveform class="h-4 w-4 text-white" />
      </div>
      <div class="hidden flex-col lg:flex">
        <span class="text-daw-text text-xs font-bold tracking-tight whitespace-nowrap uppercase">Melody Mate</span>
        <span class="text-daw-text-muted text-micro hidden font-mono leading-none lg:inline">
          v{{ APP_METADATA.version }}
        </span>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
  import { AudioWaveform, PanelLeft } from '@lucide/vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import { useUiStore } from '@/stores/ui.store'
  import { APP_METADATA } from '@/config/defaults'
  const uiStore = useUiStore()
</script>
