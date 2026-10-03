<template>
  <div class="flex shrink-0 items-center gap-1.5 xl:gap-2">
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
  import { HelpCircle, PanelRight } from '@lucide/vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import { useUiStore } from '@/stores/ui.store'

  const uiStore = useUiStore()
</script>
