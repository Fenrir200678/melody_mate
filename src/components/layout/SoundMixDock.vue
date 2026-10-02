<template>
  <section
    id="sound-mix-dock"
    ref="dockRef"
    class="border-daw-border bg-daw-panel flex min-h-0 shrink-0 flex-col border-t"
    :style="{ height: `${effectiveHeight}px` }"
    aria-labelledby="sound-mix-title"
  >
    <DawResizeHandle
      :model-value="effectiveHeight"
      orientation="horizontal"
      side="bottom"
      :min="minDockHeight"
      :max="maxDockHeight"
      :default-value="DEFAULT_UI_DIMENSIONS.soundDock.defaultHeight"
      label="Resize Sound and Mix dock"
      @update:model-value="uiStore.setSoundDockHeight"
    />
    <header class="border-daw-border flex h-9 shrink-0 items-center justify-between gap-2 border-b px-3">
      <div class="flex min-w-0 items-center gap-2">
        <AudioLines class="text-daw-signal h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <h2 id="sound-mix-title" class="text-daw-text text-2xs font-bold tracking-wider uppercase">Sound &amp; Mix</h2>
        <span class="text-daw-text-muted text-micro hidden font-mono md:inline">Factory sounds · Master output</span>
      </div>
      <DawIconButton
        :icon="X"
        size="sm"
        appearance="ghost"
        title="Close Sound & Mix (S / Esc)"
        aria-label="Close Sound and Mix"
        @click="uiStore.setSoundDockOpen(false)"
      />
    </header>
    <div class="min-h-0 flex-1">
      <SynthRack />
    </div>
  </section>
</template>

<script setup lang="ts">
  import { useTemplateRef } from 'vue'
  import { AudioLines, X } from '@lucide/vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import DawResizeHandle from '@/components/common/DawResizeHandle.vue'
  import SynthRack from '@/components/generator/SynthRack.vue'
  import { DEFAULT_UI_DIMENSIONS } from '@/config/ui-defaults'
  import { useStudioDockSize } from '@/composables/useStudioDockSize'
  import { useUiStore } from '@/stores/ui.store'

  const uiStore = useUiStore()
  const dockRef = useTemplateRef<HTMLElement>('dockRef')
  const { effectiveHeight, minDockHeight, maxDockHeight } = useStudioDockSize(
    dockRef,
    () => uiStore.soundDockHeight,
    DEFAULT_UI_DIMENSIONS.soundDock
  )
</script>
