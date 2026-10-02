<template>
  <div>
    <!-- Reset to Default Settings Trigger -->
    <DawButton
      class="footer-utility-action"
      appearance="surface"
      variant="danger"
      size="md"
      :active="isResetOpen"
      :icon="RotateCcw"
      aria-label="Reset Settings"
      title="Reset all settings to their defaults"
      @click="isResetOpen = true"
    >
      <span class="hidden lg:inline">Reset Settings</span>
    </DawButton>

    <!-- Reset Settings Confirmation Modal -->
    <DawModal v-model="isResetOpen" title="Reset to default settings" max-width="max-w-md">
      <p class="text-daw-text-muted text-xs leading-relaxed">
        All project, generator, sound preview and UI settings will be restored to their defaults. Your melody notes and
        chord progression are kept.
      </p>

      <template #footer>
        <DawButton appearance="surface" size="md" @click="isResetOpen = false"> Cancel </DawButton>

        <DawButton appearance="primary" variant="danger" size="md" @click="resetSettings"> Reset everything </DawButton>
      </template>
    </DawModal>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { RotateCcw } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawModal from '@/components/common/DawModal.vue'
  import { useAudioStore } from '@/stores/audio.store'
  import { useMelodyStore } from '@/stores/melody.store'
  import { useModuleLayoutStore } from '@/stores/module-layout.store'
  import { useProjectStore } from '@/stores/project.store'
  import { useRhythmStore } from '@/stores/rhythm.store'
  import { useUiStore } from '@/stores/ui.store'

  const audioStore = useAudioStore()
  const melodyStore = useMelodyStore()
  const moduleLayoutStore = useModuleLayoutStore()
  const projectStore = useProjectStore()
  const rhythmStore = useRhythmStore()
  const uiStore = useUiStore()

  const isResetOpen = ref(false)

  function resetSettings(): void {
    rhythmStore.stopPreview()
    audioStore.stop()
    projectStore.reset()
    melodyStore.resetGeneratorParams()
    melodyStore.resetVariationSettings()
    audioStore.reset()
    uiStore.reset()
    moduleLayoutStore.reset()
    // Project reset bypasses the transport sync in DawTransportControls, so re-apply tempo and loop
    audioStore.setBpm(projectStore.bpm)
    audioStore.setLooping(projectStore.isLooping)
    isResetOpen.value = false
  }
</script>
