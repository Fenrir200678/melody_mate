<template>
  <div ref="root" class="piano-roll-view-control relative" @keydown.esc.stop.prevent="closeAndFocus">
    <DawButton
      :id="triggerId"
      size="sm"
      appearance="ghost"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      :aria-controls="menuId"
      class="tool-btn"
      @click="toggleMenu"
      @keydown.down.prevent="openMenu"
    >
      <span>View</span>
      <ChevronDown class="h-3.5 w-3.5 opacity-60" />
    </DawButton>

    <div
      v-if="isOpen"
      :id="menuId"
      class="piano-roll-view-menu rounded-panel border-daw-border bg-daw-panel absolute top-full right-0 z-50 mt-1 min-w-52 border p-1 shadow-lg"
      role="menu"
      :aria-labelledby="triggerId"
      @keydown="handleMenuKeydown"
    >
      <div role="group" aria-label="Time zoom" class="pb-1">
        <p class="text-daw-text-muted text-micro px-2 py-1 font-semibold">Time zoom</p>
        <DawButton
          role="menuitem"
          block
          align="start"
          size="sm"
          appearance="ghost"
          :icon="ZoomOut"
          @click="runAction('zoomOutHorizontal')"
        >
          Zoom out
        </DawButton>
        <DawButton
          role="menuitem"
          block
          align="start"
          size="sm"
          appearance="ghost"
          :icon="ZoomIn"
          @click="runAction('zoomInHorizontal')"
        >
          Zoom in
        </DawButton>
      </div>

      <div role="group" aria-label="Pitch zoom" class="border-daw-border border-t py-1">
        <p class="text-daw-text-muted text-micro px-2 py-1 font-semibold">Pitch zoom</p>
        <DawButton
          role="menuitem"
          block
          align="start"
          size="sm"
          appearance="ghost"
          :icon="ChevronsDownUp"
          @click="runAction('zoomOutVertical')"
        >
          Zoom out
        </DawButton>
        <DawButton
          role="menuitem"
          block
          align="start"
          size="sm"
          appearance="ghost"
          :icon="ChevronsUpDown"
          @click="runAction('zoomInVertical')"
        >
          Zoom in
        </DawButton>
      </div>

      <div role="group" aria-label="Fit and reset" class="border-daw-border border-t pt-1">
        <DawButton
          role="menuitem"
          block
          align="start"
          size="sm"
          appearance="ghost"
          :icon="MoveHorizontal"
          @click="runAction('fitLoop')"
        >
          Fit loop
        </DawButton>
        <DawButton
          role="menuitem"
          block
          align="start"
          size="sm"
          appearance="ghost"
          :icon="MoveVertical"
          @click="runAction('fitHeight')"
        >
          Fit height
        </DawButton>
        <DawButton
          role="menuitem"
          block
          align="start"
          size="sm"
          appearance="ghost"
          :icon="RotateCcw"
          @click="runAction('resetZoom')"
        >
          Reset
        </DawButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
  import {
    ChevronDown,
    ChevronsDownUp,
    ChevronsUpDown,
    MoveHorizontal,
    MoveVertical,
    RotateCcw,
    ZoomIn,
    ZoomOut
  } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'

  type ViewAction =
    | 'zoomInHorizontal'
    | 'zoomOutHorizontal'
    | 'zoomInVertical'
    | 'zoomOutVertical'
    | 'resetZoom'
    | 'fitLoop'
    | 'fitHeight'

  const emit = defineEmits<(event: ViewAction) => void>()

  const isOpen = ref(false)
  const root = ref<HTMLElement | null>(null)
  const triggerId = 'piano-roll-view-trigger'
  const menuId = 'piano-roll-view-menu'

  function closeMenu() {
    isOpen.value = false
  }

  async function openMenu() {
    isOpen.value = true
    await nextTick()
    root.value?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  }

  function toggleMenu() {
    if (isOpen.value) closeMenu()
    else void openMenu()
  }

  function closeAndFocus() {
    closeMenu()
    root.value?.querySelector<HTMLElement>('button')?.focus()
  }

  function runAction(action: ViewAction) {
    emit(action)
    closeAndFocus()
  }

  function handleOutsidePointer(event: PointerEvent) {
    if (event.target instanceof Node && !root.value?.contains(event.target)) closeMenu()
  }

  function handleMenuKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const items = Array.from(root.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
      const current = items.indexOf(document.activeElement as HTMLElement)
      const direction = event.key === 'ArrowDown' ? 1 : -1
      items[(current + direction + items.length) % items.length]?.focus()
    }
  }

  onMounted(() => document.addEventListener('pointerdown', handleOutsidePointer))
  onBeforeUnmount(() => document.removeEventListener('pointerdown', handleOutsidePointer))
</script>
