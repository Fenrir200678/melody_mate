<template>
  <div ref="soundMixRef" class="relative">
    <DawButton
      id="sound-mix-toggle"
      appearance="surface"
      variant="signal"
      size="md"
      :active="uiStore.isSoundDockOpen"
      :aria-expanded="uiStore.isSoundDockOpen"
      aria-haspopup="dialog"
      aria-label="Toggle Sound and Mix"
      title="Toggle Sound & Mix controls (S)"
      @click="uiStore.toggleSoundDock()"
    >
      <AudioLines class="text-daw-signal h-3.5 w-3.5" />
      <span class="hidden xl:inline">Sound &amp; Mix</span>
      <ChevronUp
        class="text-daw-text-muted h-3 w-3 transition-transform"
        :class="{ 'rotate-180': uiStore.isSoundDockOpen }"
      />
    </DawButton>

    <!-- Sound & Mix Floating Popover -->
    <div
      v-if="uiStore.isSoundDockOpen"
      class="bg-daw-panel border-daw-border rounded-panel animate-in fade-in zoom-in-95 absolute bottom-full left-1/2 z-50 mb-2 flex w-215 max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col border shadow-2xl duration-100"
      role="dialog"
      aria-label="Sound and mix controls"
      @keydown.esc.stop="uiStore.setSoundDockOpen(false)"
    >
      <!-- Popover Header -->
      <div class="border-daw-border bg-daw-surface/50 flex items-center justify-between border-b px-3 py-1.5">
        <div class="flex items-center gap-2">
          <AudioLines class="text-daw-signal h-3.5 w-3.5" />
          <span class="text-daw-text text-2xs font-bold tracking-wider uppercase">Sound &amp; Mix</span>
          <span class="text-daw-text-muted text-micro font-mono">Factory sounds · Master output</span>
        </div>
        <div class="flex items-center gap-2">
          <!-- Panic Button -->
          <DawButton
            size="sm"
            appearance="surface"
            variant="danger"
            :icon="OctagonAlert"
            title="Panic: silence all voices and clear effect tails"
            @click="audioStore.panic"
          >
            Panic
          </DawButton>

          <DawIconButton
            :icon="X"
            size="sm"
            appearance="ghost"
            title="Close Sound & Mix (S / Esc)"
            aria-label="Close Sound & Mix"
            @click="uiStore.setSoundDockOpen(false)"
          />
        </div>
      </div>

      <!-- Popover Content: SynthRack -->
      <div class="h-72 min-h-0 overflow-hidden p-2">
        <SynthRack />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { defineAsyncComponent, ref } from 'vue'
  import { onClickOutside } from '@vueuse/core'
  import { AudioLines, ChevronUp, OctagonAlert, X } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import { useAudioStore } from '@/stores/audio.store'
  import { useUiStore } from '@/stores/ui.store'

  const SynthRack = defineAsyncComponent(() => import('@/components/generator/SynthRack.vue'))

  const audioStore = useAudioStore()
  const uiStore = useUiStore()

  const soundMixRef = ref<HTMLElement | null>(null)

  onClickOutside(soundMixRef, (event) => {
    const target = event.target as HTMLElement | null
    const isInsidePopover =
      Boolean(target?.closest?.('[data-daw-popover]')) ||
      event.composedPath().some((el) => el instanceof HTMLElement && el.hasAttribute('data-daw-popover'))

    if (isInsidePopover) {
      return
    }

    if (uiStore.isSoundDockOpen) {
      uiStore.setSoundDockOpen(false)
    }
  })
</script>
