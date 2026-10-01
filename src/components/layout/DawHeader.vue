<template>
  <header class="daw-header bg-daw-panel border-daw-border text-daw-text z-30 border-b px-3 py-2 select-none">
    <!-- Left Group: Branding & Left Sidebar Toggle -->
    <DawHeaderBrand class="shrink-0" />

    <!-- Center Group: Generative Hero Action, Hardware Transport & Musical Context Displays -->
    <div class="daw-header-center flex min-w-0 items-center gap-2 xl:gap-2.5">
      <!-- Primary Generative Action Pill -->
      <MelodyGenerateControls />

      <!-- Transport, Loop & Timing -->
      <div
        class="bg-daw-surface border-daw-border rounded-control flex shrink-0 items-center border p-1 font-mono text-xs shadow-inner"
      >
        <DawTransportControls />
      </div>

      <!-- Musical Key, Scale & Structure -->
      <div
        class="bg-daw-surface border-daw-border rounded-control flex shrink-0 items-center border p-1 font-mono text-xs shadow-inner"
      >
        <DawProjectSettings />
      </div>
      <div ref="grooveButton" class="relative shrink-0">
        <DawButton
          appearance="surface"
          variant="signal"
          size="md"
          :icon="SlidersHorizontal"
          :active="isGrooveOpen"
          aria-controls="groove-panel"
          aria-label="Groove settings"
          title="Groove"
          @click="toggleGroove"
        >
          Groove
        </DawButton>
      </div>
    </div>

    <!-- Right Group: Active Rhythm & Sidebar Actions -->
    <div class="flex min-w-0 shrink-0 items-center justify-end gap-2">
      <DawHeaderActions />
    </div>

    <Teleport to="body">
      <div
        v-if="isGrooveOpen"
        id="groove-panel"
        ref="groovePanel"
        class="bg-daw-panel border-daw-border rounded-panel fixed z-50 w-72 overflow-y-auto border p-2 shadow-xl"
        :style="groovePosition"
        tabindex="-1"
        @keydown.esc="closeGroove"
      >
        <ProjectGrooveModule />
      </div>
    </Teleport>
  </header>
</template>

<script setup lang="ts">
  import { nextTick, ref } from 'vue'
  import { onClickOutside, useEventListener } from '@vueuse/core'
  import { SlidersHorizontal } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import MelodyGenerateControls from '@/components/generator/MelodyGenerateControls.vue'
  import DawHeaderActions from './header/DawHeaderActions.vue'
  import DawHeaderBrand from './header/DawHeaderBrand.vue'
  import DawProjectSettings from './header/DawProjectSettings.vue'
  import DawTransportControls from './header/DawTransportControls.vue'
  import ProjectGrooveModule from './header/ProjectGrooveModule.vue'

  const isGrooveOpen = ref(false)
  const grooveButton = ref<HTMLElement | null>(null)
  const groovePanel = ref<HTMLElement | null>(null)
  const groovePosition = ref({ top: '0px', left: '0px', maxHeight: '0px' })

  function updateGroovePosition(): void {
    if (!grooveButton.value) return

    const button = grooveButton.value.getBoundingClientRect()
    const panelWidth = 288
    const gutter = 8
    const top = button.bottom + gutter
    groovePosition.value = {
      top: `${top}px`,
      left: `${Math.max(gutter, Math.min(button.right - panelWidth, window.innerWidth - panelWidth - gutter))}px`,
      maxHeight: `${Math.max(0, window.innerHeight - top - gutter)}px`
    }
  }

  async function toggleGroove(): Promise<void> {
    if (isGrooveOpen.value) {
      isGrooveOpen.value = false
      return
    }

    updateGroovePosition()
    isGrooveOpen.value = true
    await nextTick()
    groovePanel.value?.focus()
  }

  function closeGroove(): void {
    isGrooveOpen.value = false
    grooveButton.value?.querySelector<HTMLElement>('button')?.focus()
  }

  onClickOutside(
    groovePanel,
    () => {
      isGrooveOpen.value = false
    },
    { ignore: [grooveButton] }
  )
  useEventListener(window, 'resize', updateGroovePosition)
  useEventListener(window, 'scroll', updateGroovePosition, true)
</script>
