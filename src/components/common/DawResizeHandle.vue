<template>
  <div
    class="group focus-visible:bg-daw-signal/20 flex shrink-0 touch-none items-center justify-center select-none focus-visible:outline-none"
    :class="isHorizontal ? 'h-2 w-full cursor-row-resize' : 'w-2 cursor-col-resize'"
    role="separator"
    :aria-orientation="isHorizontal ? 'horizontal' : 'vertical'"
    :aria-label="label"
    :aria-valuenow="modelValue"
    :aria-valuemin="min"
    :aria-valuemax="max"
    tabindex="0"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @dblclick="onDoubleClick"
    @keydown="onKeyDown"
  >
    <span
      class="rounded-full transition-colors"
      :class="[
        isHorizontal ? 'h-1 w-10' : 'h-10 w-1',
        indicatorOffsetClass,
        isDragging ? 'bg-daw-signal' : 'bg-daw-border group-hover:bg-daw-signal'
      ]"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { clamp } from '@/utils/knob.utils'

  export interface DawResizeHandleProps {
    modelValue: number
    min?: number
    max?: number
    step?: number
    defaultValue?: number
    orientation?: 'vertical' | 'horizontal'
    /** Edge of the handle the resized panel sits on — drives the drag direction. */
    side?: 'left' | 'right' | 'top' | 'bottom'
    label?: string
  }

  const props = withDefaults(defineProps<DawResizeHandleProps>(), {
    min: 0,
    max: Number.MAX_SAFE_INTEGER,
    step: 16,
    defaultValue: undefined,
    orientation: 'vertical',
    side: 'left',
    label: 'Resize panel'
  })

  const emit = defineEmits<{
    'update:modelValue': [value: number]
    'update:isDragging': [value: boolean]
  }>()

  const isDragging = ref(false)
  const dragStartPos = ref(0)
  const dragStartSize = ref(0)

  const isHorizontal = computed(() => props.orientation === 'horizontal')

  const indicatorOffsetClass = computed(() => {
    if (isHorizontal.value) return props.side === 'top' ? 'mb-1' : 'mt-1'
    return props.side === 'right' ? 'ml-1' : 'mr-1'
  })

  function updateSize(next: number): void {
    const clamped = clamp(next, props.min, props.max)
    if (clamped !== props.modelValue) {
      emit('update:modelValue', clamped)
    }
  }

  function onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return

    isDragging.value = true
    dragStartPos.value = isHorizontal.value ? e.clientY : e.clientX
    dragStartSize.value = props.modelValue
    emit('update:isDragging', true)

    const target = e.currentTarget as HTMLElement
    target?.setPointerCapture?.(e.pointerId)
  }

  /** Positive delta always means "the resized panel grows". */
  function resolvePointerDelta(e: PointerEvent): number {
    if (isHorizontal.value) {
      const dy = e.clientY - dragStartPos.value
      return props.side === 'top' ? dy : -dy
    }
    const dx = e.clientX - dragStartPos.value
    return props.side === 'right' ? -dx : dx
  }

  function onPointerMove(e: PointerEvent): void {
    if (!isDragging.value) return
    updateSize(dragStartSize.value + resolvePointerDelta(e))
  }

  function onPointerUp(e: PointerEvent): void {
    if (!isDragging.value) return

    isDragging.value = false
    emit('update:isDragging', false)

    const target = e.currentTarget as HTMLElement
    if (target?.hasPointerCapture?.(e.pointerId)) {
      target.releasePointerCapture(e.pointerId)
    }
  }

  function onDoubleClick(): void {
    if (props.defaultValue !== undefined) {
      updateSize(props.defaultValue)
    }
  }

  /** Arrow direction that grows the panel, expressed as a -1/1 size step. */
  function resolveKeyDirection(key: string): number | null {
    if (isHorizontal.value) {
      if (key === 'ArrowUp') return props.side === 'top' ? -1 : 1
      if (key === 'ArrowDown') return props.side === 'top' ? 1 : -1
      return null
    }
    if (key === 'ArrowLeft') return props.side === 'right' ? 1 : -1
    if (key === 'ArrowRight') return props.side === 'right' ? -1 : 1
    return null
  }

  function onKeyDown(e: KeyboardEvent): void {
    const direction = resolveKeyDirection(e.key)

    if (direction !== null) {
      e.preventDefault()
      updateSize(props.modelValue + direction * props.step)
    } else if (e.key === 'Home') {
      e.preventDefault()
      updateSize(props.min)
    } else if (e.key === 'End') {
      e.preventDefault()
      updateSize(props.max)
    }
  }
</script>
