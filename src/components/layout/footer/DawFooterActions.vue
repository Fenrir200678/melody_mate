<template>
  <div class="flex items-center gap-2">
    <DawHistoryControls />
    <DawResetSettingsModal />
    <DawMidiExportPopover />
  </div>
</template>

<script setup lang="ts">
  import DawHistoryControls from './DawHistoryControls.vue'
  import DawResetSettingsModal from './DawResetSettingsModal.vue'
  import DawMidiExportPopover from './DawMidiExportPopover.vue'
</script>
