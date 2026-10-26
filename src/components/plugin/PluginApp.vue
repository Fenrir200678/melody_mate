<template>
  <div class="daw-shell">
    <PluginHeader v-model:output="output" :status="status" :host-bpm="hostBpm" :ready="ready" />
    <DawWorkspace v-if="ready" />
    <button v-if="needsReset" type="button" class="text-daw-signal p-4 text-sm underline" @click="resetInvalidState">
      Reset incompatible plugin session
    </button>
    <p v-if="!ready" class="text-daw-text-muted p-4 text-sm" role="status">{{ status }}</p>
    <DawShortcutsModal v-model="shortcutsOpen" />
    <DawAboutModal v-model="aboutOpen" />
  </div>
</template>

<script setup lang="ts">
  import { computed, defineAsyncComponent } from 'vue'
  import DawWorkspace from '../layout/DawWorkspace.vue'
  import PluginHeader from './PluginHeader.vue'
  import { usePluginSession } from '@/platform/plugin/usePluginSession'
  import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
  import { useUiStore } from '@/stores/ui.store'

  const DawShortcutsModal = defineAsyncComponent(() => import('../common/DawShortcutsModal.vue'))
  const DawAboutModal = defineAsyncComponent(() => import('./PluginAboutModal.vue'))
  const { ready, status, output, hostBpm, needsReset, resetInvalidState } = usePluginSession()
  const ui = useUiStore()
  const shortcutsOpen = computed({
    get: () => ui.isShortcutsOpen,
    set: (value: boolean) => {
      if (!value) ui.closeShortcuts()
    }
  })
  const aboutOpen = computed({
    get: () => ui.isAboutOpen,
    set: (value: boolean) => {
      if (!value) ui.closeAbout()
    }
  })
  useKeyboardShortcuts()
</script>
