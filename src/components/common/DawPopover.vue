<template>
  <div ref="triggerRef" class="relative inline-flex">
    <slot :is-open="isOpen" :toggle="toggle" :open="open" :close="close" />

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="isOpen"
          ref="popoverRef"
          class="rounded-control border-daw-border bg-daw-surface/95 font-ui text-daw-text fixed z-50 border shadow-2xl backdrop-blur-md outline-none"
          :class="contentClass"
          :style="popoverStyle"
          data-daw-popover
          tabindex="-1"
          @keydown.esc.stop="close"
        >
          <slot name="content" :close="close" />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
  import { onClickOutside } from '@vueuse/core'

  interface Props {
    side?: 'top' | 'bottom' | 'left' | 'right'
    align?: 'start' | 'center' | 'end'
    sideOffset?: number
    matchTriggerWidth?: boolean
    disabled?: boolean
    contentClass?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    side: 'bottom',
    align: 'start',
    sideOffset: 4,
    matchTriggerWidth: false,
    disabled: false,
    contentClass: ''
  })

  const isOpen = defineModel<boolean>('open', { default: false })

  const triggerRef = ref<HTMLElement | null>(null)
  const popoverRef = ref<HTMLElement | null>(null)
  const coords = ref<{ x: number; y: number }>({ x: 0, y: 0 })
  const triggerWidth = ref<number | null>(null)

  const popoverStyle = computed(() => {
    const style: Record<string, string> = {
      top: `${coords.value.y}px`,
      left: `${coords.value.x}px`
    }
    if (props.matchTriggerWidth && triggerWidth.value !== null) {
      style.minWidth = `${triggerWidth.value}px`
    }
    return style
  })

  function updatePosition(): void {
    if (!triggerRef.value || !popoverRef.value) return

    const triggerRect = triggerRef.value.getBoundingClientRect()
    const popoverRect = popoverRef.value.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    triggerWidth.value = Math.round(triggerRect.width)

    let resolvedSide = props.side
    let y = 0
    let x = 0

    // Auto-flip if colliding with screen boundaries
    if (resolvedSide === 'bottom' && triggerRect.bottom + popoverRect.height + props.sideOffset > viewportHeight - 8) {
      resolvedSide = 'top'
    } else if (resolvedSide === 'top' && triggerRect.top - popoverRect.height - props.sideOffset < 8) {
      resolvedSide = 'bottom'
    }

    if (resolvedSide === 'top') {
      y = triggerRect.top - popoverRect.height - props.sideOffset
    } else if (resolvedSide === 'bottom') {
      y = triggerRect.bottom + props.sideOffset
    } else if (resolvedSide === 'left') {
      x = triggerRect.left - popoverRect.width - props.sideOffset
      y = triggerRect.top + (triggerRect.height - popoverRect.height) / 2
    } else if (resolvedSide === 'right') {
      x = triggerRect.right + props.sideOffset
      y = triggerRect.top + (triggerRect.height - popoverRect.height) / 2
    }

    if (resolvedSide === 'top' || resolvedSide === 'bottom') {
      if (props.align === 'start') {
        x = triggerRect.left
      } else if (props.align === 'end') {
        x = triggerRect.right - popoverRect.width
      } else {
        x = triggerRect.left + (triggerRect.width - popoverRect.width) / 2
      }
    }

    // Viewport boundaries clamping
    x = Math.max(8, Math.min(viewportWidth - popoverRect.width - 8, x))
    y = Math.max(8, Math.min(viewportHeight - popoverRect.height - 8, y))

    coords.value = { x: Math.round(x), y: Math.round(y) }
  }

  function open(): void {
    if (props.disabled) return
    isOpen.value = true
  }

  function close(): void {
    isOpen.value = false
  }

  function toggle(): void {
    if (props.disabled) return
    isOpen.value = !isOpen.value
  }

  onClickOutside(
    popoverRef,
    () => {
      if (isOpen.value) close()
    },
    { ignore: [triggerRef] }
  )

  watch(isOpen, async (openVal) => {
    if (openVal) {
      if (triggerRef.value) {
        const r = triggerRef.value.getBoundingClientRect()
        triggerWidth.value = Math.round(r.width)
        coords.value = { x: Math.round(r.left), y: Math.round(r.bottom + props.sideOffset) }
      }
      await nextTick()
      updatePosition()
    }
  })

  function onScrollOrResize(): void {
    if (isOpen.value) {
      updatePosition()
    }
  }

  onMounted(() => {
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', onScrollOrResize, true)
    window.removeEventListener('resize', onScrollOrResize)
  })
</script>
