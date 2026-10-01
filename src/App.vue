<template>
  <DawMobileGate />
  <div class="daw-shell">
    <DawHeader />
    <div
      v-if="audioStore.initializationError"
      role="alert"
      class="bg-daw-panel border-daw-border text-daw-text flex items-center justify-center gap-3 border-b px-4 py-2 text-xs"
    >
      <span>{{ audioStore.initializationError }}</span>
      <button type="button" class="text-daw-signal underline" @click="audioStore.initializeAudio">Retry audio</button>
    </div>
    <DawWorkspace />
    <DawFooter />
    <DawShortcutsModal v-model="isShortcutsOpen" />
    <DawAboutModal v-model="isAboutOpen" />
    <DawWelcomeModal v-model="isWelcomeOpen" />
  </div>
</template>

<script setup lang="ts">
  import { computed, defineAsyncComponent, onMounted } from 'vue'
  import DawFooter from '@/components/layout/DawFooter.vue'
  import DawHeader from '@/components/layout/DawHeader.vue'
  import DawMobileGate from '@/components/layout/DawMobileGate.vue'
  import DawWorkspace from '@/components/layout/DawWorkspace.vue'

  const DawAboutModal = defineAsyncComponent(() => import('@/components/common/DawAboutModal.vue'))
  const DawShortcutsModal = defineAsyncComponent(() => import('@/components/common/DawShortcutsModal.vue'))
  const DawWelcomeModal = defineAsyncComponent(() => import('@/components/common/DawWelcomeModal.vue'))
  import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
  import { useTransport } from '@/composables/useTransport'
  import { useAudioStore } from '@/stores/audio.store'
  import { useAudioSettingsStore } from '@/stores/audio-settings.store'
  import { useUiStore } from '@/stores/ui.store'

  const uiStore = useUiStore()
  const audioStore = useAudioStore()
  const audioSettingsStore = useAudioSettingsStore()
  const isShortcutsOpen = computed({
    get: () => uiStore.isShortcutsOpen,
    set: (open: boolean) => {
      if (open) uiStore.openShortcuts()
      else uiStore.closeShortcuts()
    }
  })
  const isAboutOpen = computed({
    get: () => uiStore.isAboutOpen,
    set: (open: boolean) => {
      if (open) uiStore.openAbout()
      else uiStore.closeAbout()
    }
  })
  const isWelcomeOpen = computed({
    get: () => uiStore.isWelcomeOpen,
    set: (open: boolean) => {
      if (open) uiStore.openWelcome()
      else uiStore.closeWelcome()
    }
  })

  // Initialize global DAW keyboard shortcuts and transport RAF loop exactly once
  useKeyboardShortcuts()
  useTransport()

  // Restore the compact factory-sound and mix snapshot before the first playback.
  audioSettingsStore.hydrateProjectAudio()

  // Unlock AudioContext on first user interaction and check first-run welcome dialog
  onMounted(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 768) {
        uiStore.checkStartupWelcome()
      }

      const unlockAudio = () => {
        if (window.innerWidth >= 768) {
          window.removeEventListener('pointerdown', unlockAudio)
          window.removeEventListener('keydown', unlockAudio)
          void audioStore.initializeAudio()
        }
      }
      window.addEventListener('pointerdown', unlockAudio)
      window.addEventListener('keydown', unlockAudio)
    }
  })
</script>
