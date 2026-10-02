<template>
  <div class="flex items-center gap-2">
    <DawButton
      size="md"
      appearance="surface"
      variant="danger"
      :icon="OctagonAlert"
      title="Panic: silence all voices and clear effect tails"
      @click="audioStore.panic"
    >
      Panic
    </DawButton>
    <DawHistoryControls />
    <DawResetSettingsModal />
    <DawMidiExportPopover />
  </div>
</template>

<script setup lang="ts">
  import { OctagonAlert } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import { useAudioStore } from '@/stores/audio.store'
  import DawHistoryControls from './DawHistoryControls.vue'
  import DawResetSettingsModal from './DawResetSettingsModal.vue'
  import DawMidiExportPopover from './DawMidiExportPopover.vue'
  const audioStore = useAudioStore()
</script>
