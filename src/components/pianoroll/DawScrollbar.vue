<template>
  <div
    class="daw-scrollbar flex shrink-0 select-none"
    :class="[
      orientation === 'horizontal'
        ? 'border-daw-border bg-daw-panel h-2.5 w-full border-t'
        : 'border-daw-border bg-daw-panel h-full w-2.5 border-l'
    ]"
    role="scrollbar"
    :aria-orientation="orientation"
    :aria-valuenow="offset"
    :aria-valuemin="0"
    :aria-valuemax="resolvedMaxOffset"
  >
    <!-- Optional Left/Top Indent Spacer to align with sticky keyboard / panels -->
    <div
      v-if="orientation === 'horizontal' && indent > 0"
      class="border-daw-border bg-daw-panel shrink-0 border-r"
      :style="{ width: `${indent}px` }"
    />

    <!-- Interactive Track -->
    <div
      ref="trackRef"
      class="scrollbar-track relative h-full flex-1 cursor-pointer overflow-hidden"
      @pointerdown="onTrackPointerDown"
    >
      <!-- Draggable Thumb -->
      <div
        class="scrollbar-thumb absolute rounded-xs transition-colors"
        :class="[
          isDisabled
            ? 'bg-daw-surface cursor-default opacity-20'
            : isDragging
              ? 'bg-daw-signal cursor-grabbing'
              : 'bg-daw-surface hover:bg-daw-border active:bg-daw-signal cursor-grab'
        ]"
        :style="thumbStyle"
        @pointerdown.stop="onThumbPointerDown"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, useTemplateRef } from 'vue'
  import { useElementSize } from '@vueuse/core'

  const props = withDefaults(
    defineProps<{
      orientation?: 'horizontal' | 'vertical'
      visible?: number
      total?: number
      offset?: number
      maxOffset?: number
      indent?: number
    }>(),
    {
      orientation: 'horizontal',
      visible: 100,
      total: 100,
      offset: 0,
      maxOffset: undefined,
      indent: 0
    }
  )

  const emit = defineEmits<{
    'update:offset': [offset: number]
  }>()

  const trackRef = useTemplateRef<HTMLDivElement>('trackRef')
  const { width: trackWidth, height: trackHeight } = useElementSize(trackRef)

  const isDragging = ref(false)
  let dragStartPointer = 0
  let dragStartOffset = 0

  const trackLength = computed(() => {
    return props.orientation === 'horizontal' ? trackWidth.value : trackHeight.value
  })

  const resolvedMaxOffset = computed(() => {
    if (props.maxOffset !== undefined) return Math.max(0, props.maxOffset)
    return Math.max(0, props.total - props.visible)
  })

  const isDisabled = computed(() => {
    return resolvedMaxOffset.value <= 0 || props.total <= props.visible
  })

  const thumbSize = computed(() => {
    if (trackLength.value <= 0) return 20
    if (isDisabled.value) return trackLength.value
    const ratio = Math.max(0.05, Math.min(1, props.visible / Math.max(1, props.total)))
    return Math.max(16, Math.round(ratio * trackLength.value))
  })

  const thumbPosition = computed(() => {
    if (isDisabled.value || trackLength.value <= thumbSize.value) return 0
    const maxOffsetVal = resolvedMaxOffset.value
    if (maxOffsetVal <= 0) return 0
    const scrollRatio = Math.max(0, Math.min(1, props.offset / maxOffsetVal))
    const availableTrack = trackLength.value - thumbSize.value
    return Math.round(scrollRatio * availableTrack)
  })

  const thumbStyle = computed(() => {
    if (props.orientation === 'horizontal') {
      return {
        left: `${thumbPosition.value}px`,
        width: `${thumbSize.value}px`,
        top: '1px',
        bottom: '1px'
      }
    }
    return {
      top: `${thumbPosition.value}px`,
      height: `${thumbSize.value}px`,
      left: '1px',
      right: '1px'
    }
  })

  function onThumbPointerDown(e: PointerEvent): void {
    if (isDisabled.value || e.button !== 0) return
    e.preventDefault()

    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)

    isDragging.value = true
    dragStartPointer = props.orientation === 'horizontal' ? e.clientX : e.clientY
    dragStartOffset = props.offset

    function onPointerMove(ev: PointerEvent) {
      if (!isDragging.value) return
      const currentPointer = props.orientation === 'horizontal' ? ev.clientX : ev.clientY
      const deltaPixels = currentPointer - dragStartPointer
      const availableTrack = trackLength.value - thumbSize.value
      if (availableTrack <= 0) return

      const offsetChange = (deltaPixels / availableTrack) * resolvedMaxOffset.value
      const targetOffset = Math.max(0, Math.min(resolvedMaxOffset.value, Math.round(dragStartOffset + offsetChange)))
      emit('update:offset', targetOffset)
    }

    function onPointerUp(ev: PointerEvent) {
      isDragging.value = false
      target.releasePointerCapture(ev.pointerId)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  function onTrackPointerDown(e: PointerEvent): void {
    if (isDisabled.value || e.button !== 0 || !trackRef.value) return
    const rect = trackRef.value.getBoundingClientRect()
    const clickCoord = props.orientation === 'horizontal' ? e.clientX - rect.left : e.clientY - rect.top
    const targetThumbPos = clickCoord - thumbSize.value / 2
    const availableTrack = trackLength.value - thumbSize.value
    if (availableTrack <= 0) return

    const ratio = Math.max(0, Math.min(1, targetThumbPos / availableTrack))
    const targetOffset = Math.max(0, Math.min(resolvedMaxOffset.value, Math.round(ratio * resolvedMaxOffset.value)))
    emit('update:offset', targetOffset)
  }
</script>
