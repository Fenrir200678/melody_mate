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
    <SoundMixDockHeader
      :view="uiStore.soundDockView"
      @update:view="uiStore.setSoundDockView"
      @close="uiStore.setSoundDockOpen(false)"
    />
    <div class="min-h-0 flex-1">
      <SynthRack v-show="uiStore.soundDockView === 'sound'" />
      <MidiOutputPanel v-show="uiStore.soundDockView === 'midi'" />
    </div>
  </section>
</template>

<script setup lang="ts">
  import { useTemplateRef } from 'vue'
  import DawResizeHandle from '@/components/common/DawResizeHandle.vue'
  import SynthRack from '@/components/generator/SynthRack.vue'
  import SoundMixDockHeader from '@/components/layout/sound-mix/SoundMixDockHeader.vue'
  import MidiOutputPanel from '@/components/layout/sound-mix/MidiOutputPanel.vue'
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
