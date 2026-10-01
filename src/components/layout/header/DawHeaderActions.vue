<template>
  <div class="flex shrink-0 items-center gap-2 xl:gap-3">
    <!-- About Melody Mate Modal Button -->
    <DawIconButton
      :icon="Info"
      size="md"
      appearance="panel"
      variant="signal"
      :active="uiStore.isAboutOpen"
      aria-haspopup="dialog"
      :aria-expanded="uiStore.isAboutOpen"
      title="About Melody Mate"
      aria-label="About Melody Mate"
      @click="uiStore.toggleAbout()"
    />

    <!-- Keyboard Shortcuts & Help Modal Button -->
    <DawIconButton
      :icon="HelpCircle"
      size="md"
      appearance="panel"
      variant="signal"
      :active="uiStore.isShortcutsOpen"
      aria-haspopup="dialog"
      :aria-expanded="uiStore.isShortcutsOpen"
      title="Help & Keyboard Shortcuts (?)"
      aria-label="Help & Keyboard Shortcuts"
      @click="uiStore.toggleShortcuts()"
    />

    <!-- Toggle Expression Panel Button -->
    <DawIconButton
      id="expression-panel-toggle"
      :icon="PanelRight"
      size="md"
      appearance="panel"
      variant="signal"
      :active="uiStore.isRightSidebarOpen"
      :aria-expanded="uiStore.isRightSidebarOpen"
      aria-controls="daw-sidebar-right"
      title="Toggle expression panel (I)"
      aria-label="Toggle expression panel"
      @click="uiStore.toggleRightSidebar()"
    />
  </div>
</template>

<script setup lang="ts">
  import { HelpCircle, Info, PanelRight } from '@lucide/vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import { useUiStore } from '@/stores/ui.store'

  const uiStore = useUiStore()
</script>
