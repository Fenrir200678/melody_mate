<template>
  <main class="daw-workspace" @keydown.esc="onEscape">
    <!-- Melody creation panel -->
    <div
      id="daw-sidebar-left"
      ref="leftSidebarRef"
      class="daw-sidebar-left"
      :inert="!uiStore.isLeftSidebarOpen"
      :class="{ collapsed: !uiStore.isLeftSidebarOpen, 'is-resizing': isResizingLeftSidebar }"
      :style="leftSidebarStyle"
    >
      <div class="flex min-h-0 flex-1">
        <div class="min-w-0 flex-1 overflow-hidden">
          <GeneratorPanel />
        </div>

        <DawResizeHandle
          v-if="isWide && uiStore.isLeftSidebarOpen"
          v-model:is-dragging="isResizingLeftSidebar"
          :model-value="uiStore.leftSidebarWidth"
          :min="LEFT_SIDEBAR_MIN_WIDTH"
          :max="leftResizeMax"
          :default-value="LEFT_SIDEBAR_DEFAULT_WIDTH"
          label="Resize generator panel"
          @update:model-value="uiStore.setLeftSidebarWidth"
        />
      </div>
    </div>

    <!-- Center Viewport: Interactive Piano Roll Workstation -->
    <section class="daw-center-viewport" aria-label="Piano Roll Workspace">
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DawPianoRoll v-bind="pianoRollProps" v-on="pianoRollEvents" />
      </div>
      <ChordStudioDock v-if="uiStore.isChordStudioOpen" />
      <RhythmStudioDock v-if="uiStore.isRhythmStudioOpen" />
      <ArpStudioDock v-if="uiStore.isArpStudioOpen" @close="uiStore.setArpStudioOpen(false)" />
    </section>

    <!-- Chords and progression panel -->
    <div
      id="daw-sidebar-right"
      ref="rightSidebarRef"
      class="daw-sidebar-right"
      :inert="!uiStore.isRightSidebarOpen"
      :class="{ collapsed: !uiStore.isRightSidebarOpen, 'is-resizing': isResizingRightSidebar }"
      :style="rightSidebarStyle"
    >
      <div class="flex min-h-0 flex-1">
        <DawResizeHandle
          v-if="isWide && uiStore.isRightSidebarOpen"
          v-model:is-dragging="isResizingRightSidebar"
          :model-value="uiStore.rightSidebarWidth"
          :min="RIGHT_SIDEBAR_MIN_WIDTH"
          :max="rightResizeMax"
          :default-value="RIGHT_SIDEBAR_DEFAULT_WIDTH"
          side="right"
          label="Resize expression panel"
          @update:model-value="uiStore.setRightSidebarWidth"
        />

        <div class="h-full min-w-0 flex-1 overflow-hidden">
          <ExpressionPanel />
        </div>
      </div>
    </div>

    <!-- Compact panel backdrop -->
    <div
      v-if="!isWide && (uiStore.isLeftSidebarOpen || uiStore.isRightSidebarOpen)"
      class="daw-panel-backdrop"
      @click="closeCompactPanels(true)"
    />
  </main>
</template>

<script setup lang="ts">
  import { computed, defineAsyncComponent, nextTick, ref, useTemplateRef, watch } from 'vue'
  import { useMediaQuery, useWindowSize } from '@vueuse/core'
  import DawResizeHandle from '@/components/common/DawResizeHandle.vue'
  import ExpressionPanel from '@/components/generator/ExpressionPanel.vue'
  import GeneratorPanel from '@/components/generator/GeneratorPanel.vue'
  import DawPianoRoll from '@/components/pianoroll/DawPianoRoll.vue'

  const ChordStudioDock = defineAsyncComponent(() => import('@/components/generator/harmony/ChordStudioDock.vue'))
  const RhythmStudioDock = defineAsyncComponent(() => import('@/components/generator/melody/RhythmStudioDock.vue'))
  const ArpStudioDock = defineAsyncComponent(() => import('@/components/generator/melody/ArpStudioDock.vue'))
  import { usePianoRollWorkspace } from '@/composables/pianoroll/usePianoRollWorkspace'
  import {
    LEFT_SIDEBAR_DEFAULT_WIDTH,
    LEFT_SIDEBAR_MAX_WIDTH,
    LEFT_SIDEBAR_MIN_WIDTH,
    MIN_CENTER_VIEWPORT_WIDTH,
    RIGHT_SIDEBAR_DEFAULT_WIDTH,
    RIGHT_SIDEBAR_MAX_WIDTH,
    RIGHT_SIDEBAR_MIN_WIDTH,
    useUiStore
  } from '@/stores/ui.store'
  import { useMelodyStore } from '@/stores/melody.store'

  const uiStore = useUiStore()
  const melodyStore = useMelodyStore()
  const { pianoRollProps, pianoRollEvents } = usePianoRollWorkspace()

  const leftSidebarRef = useTemplateRef<HTMLElement>('leftSidebarRef')
  const rightSidebarRef = useTemplateRef<HTMLElement>('rightSidebarRef')

  const isWide = useMediaQuery('(min-width: 1280px)')
  const { width: viewportWidth } = useWindowSize()
  const isResizingLeftSidebar = ref(false)
  const isResizingRightSidebar = ref(false)

  const leftResizeMax = computed(() =>
    Math.max(
      LEFT_SIDEBAR_MIN_WIDTH,
      Math.min(
        LEFT_SIDEBAR_MAX_WIDTH,
        viewportWidth.value - (uiStore.isRightSidebarOpen ? uiStore.rightSidebarWidth : 0) - MIN_CENTER_VIEWPORT_WIDTH
      )
    )
  )

  const rightResizeMax = computed(() =>
    Math.max(
      RIGHT_SIDEBAR_MIN_WIDTH,
      Math.min(
        RIGHT_SIDEBAR_MAX_WIDTH,
        viewportWidth.value - (uiStore.isLeftSidebarOpen ? uiStore.leftSidebarWidth : 0) - MIN_CENTER_VIEWPORT_WIDTH
      )
    )
  )

  const leftSidebarStyle = computed(() => {
    if (!isWide.value || !uiStore.isLeftSidebarOpen) return undefined
    const effectiveWidth = Math.min(uiStore.leftSidebarWidth, leftResizeMax.value)
    return { width: `${effectiveWidth}px` }
  })

  const rightSidebarStyle = computed(() => {
    if (!isWide.value || !uiStore.isRightSidebarOpen) return undefined
    const effectiveWidth = Math.min(uiStore.rightSidebarWidth, rightResizeMax.value)
    return { width: `${effectiveWidth}px` }
  })

  const activeCompactDrawer = computed(() => {
    if (isWide.value) return null
    if (uiStore.isLeftSidebarOpen) return 'left'
    if (uiStore.isRightSidebarOpen) return 'right'
    return null
  })

  function closeCompactPanels(restoreFocus = false): void {
    const trigger = uiStore.isLeftSidebarOpen ? 'melody-panel-toggle' : 'expression-panel-toggle'
    uiStore.setLeftSidebar(false)
    uiStore.setRightSidebar(false)
    if (restoreFocus) document.getElementById(trigger)?.focus()
  }

  watch(isWide, (wide) => {
    if (wide) {
      uiStore.setLeftSidebar(uiStore.wideLeftSidebarOpen)
      uiStore.setRightSidebar(uiStore.wideRightSidebarOpen)
    } else {
      closeCompactPanels()
    }
  })

  watch(activeCompactDrawer, (drawer) => {
    if (!drawer) return
    void nextTick(() => {
      const container = drawer === 'left' ? leftSidebarRef.value : rightSidebarRef.value
      const target = container?.querySelector<HTMLElement>('.btn-generate-trigger, button, [tabindex="0"], h2')
      target?.focus()
    })
  })

  watch(
    () => uiStore.isArpStudioOpen,
    (open) => {
      if (open) void melodyStore.loadArpModels()
    },
    { immediate: true }
  )

  function onEscape(event: KeyboardEvent): void {
    if (isWide.value || (!uiStore.isLeftSidebarOpen && !uiStore.isRightSidebarOpen)) return
    event.preventDefault()
    closeCompactPanels(true)
  }
</script>
