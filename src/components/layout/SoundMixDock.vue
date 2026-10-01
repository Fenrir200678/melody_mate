<template>
  <section
    id="sound-mix-dock"
    class="sound-mix-dock"
    :class="{ 'is-open': uiStore.isSoundDockOpen }"
    aria-label="Sound and mix"
  >
    <DawResizeHandle
      v-if="uiStore.isSoundDockOpen"
      :model-value="effectiveDockHeight"
      orientation="horizontal"
      side="bottom"
      :min="SOUND_DOCK_MIN_HEIGHT"
      :max="maxDockHeight"
      :default-value="SOUND_DOCK_DEFAULT_HEIGHT"
      label="Resize Sound and Mix dock"
      @update:model-value="uiStore.setSoundDockHeight"
    />
    <div class="sound-mix-dock-header">
      <DawButton
        id="sound-mix-toggle"
        appearance="ghost"
        size="sm"
        :icon="AudioLines"
        :aria-expanded="uiStore.isSoundDockOpen"
        aria-controls="sound-mix-content"
        @click="uiStore.toggleSoundDock()"
      >
        <span>Sound &amp; Mix</span>
        <ChevronUp
          class="text-daw-text-muted h-3 w-3 transition-transform"
          :class="{ 'rotate-180': uiStore.isSoundDockOpen }"
          aria-hidden="true"
        />
      </DawButton>
      <span class="text-daw-text-muted text-micro hidden font-mono sm:inline">Factory sounds · Master output</span>
      <DawButton
        class="ml-auto"
        size="sm"
        appearance="surface"
        variant="danger"
        :icon="OctagonAlert"
        title="Panic: silence all voices and clear effect tails"
        @click="audioStore.panic"
      >
        Panic
      </DawButton>
    </div>
    <div
      id="sound-mix-content"
      class="sound-mix-dock-content"
      :style="uiStore.isSoundDockOpen ? { height: `${effectiveDockHeight}px` } : undefined"
      :inert="!uiStore.isSoundDockOpen"
      :hidden="!uiStore.isSoundDockOpen"
    >
      <SynthRack />
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { AudioLines, ChevronUp, OctagonAlert } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawResizeHandle from '@/components/common/DawResizeHandle.vue'
  import SynthRack from '@/components/generator/SynthRack.vue'
  import { useAudioStore } from '@/stores/audio.store'
  import {
    SOUND_DOCK_DEFAULT_HEIGHT,
    SOUND_DOCK_MAX_HEIGHT,
    SOUND_DOCK_MIN_HEIGHT,
    useUiStore
  } from '@/stores/ui.store'

  const uiStore = useUiStore()
  const audioStore = useAudioStore()
  const maxDockHeight = ref(SOUND_DOCK_MAX_HEIGHT)
  const effectiveDockHeight = computed(() => Math.min(uiStore.soundDockHeight, maxDockHeight.value))

  // Keep the piano roll usable: the dock may only claim the workspace space
  // beyond a minimum edit area. Measured from the live shell instead of magic numbers.
  const DOCK_HEADER_HEIGHT = 36
  const MIN_PIANO_ROLL_HEIGHT = 400

  function updateMaxDockHeight(): void {
    const shell = document.querySelector('.daw-shell')
    const header = document.querySelector('.daw-header')
    const footer = document.querySelector('.daw-footer')
    const available =
      shell && header && footer
        ? shell.clientHeight - header.clientHeight - footer.clientHeight - DOCK_HEADER_HEIGHT - MIN_PIANO_ROLL_HEIGHT
        : SOUND_DOCK_MAX_HEIGHT
    maxDockHeight.value = Math.max(SOUND_DOCK_MIN_HEIGHT, Math.min(SOUND_DOCK_MAX_HEIGHT, available))
  }

  onMounted(() => {
    updateMaxDockHeight()
    window.addEventListener('resize', updateMaxDockHeight)
  })
  onUnmounted(() => window.removeEventListener('resize', updateMaxDockHeight))
</script>
