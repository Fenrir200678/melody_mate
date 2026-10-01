<template>
  <div
    class="daw-fader"
    :class="[`is-${orientation}`, { 'pointer-events-none opacity-50': disabled }]"
    :aria-disabled="disabled"
  >
    <!-- Label -->
    <span v-if="label" class="fader-label">
      {{ label }}
    </span>

    <!-- Fader Track -->
    <div
      ref="trackRef"
      class="fader-track focus-visible:ring-daw-signal focus-visible:ring-1 focus-visible:outline-none"
      role="slider"
      tabindex="0"
      :aria-orientation="orientation"
      :aria-label="label || 'Volume fader'"
      :aria-valuenow="model"
      :aria-valuemin="min"
      :aria-valuemax="max"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @dblclick="onDoubleClick"
      @keydown="onKeyDown"
    >
      <!-- Track Fill (Pulse color) -->
      <div class="fader-fill" :style="fillStyle" />

      <!-- Fader Thumb -->
      <div class="fader-thumb" :style="thumbStyle" />
    </div>

    <!-- Value / dB Readout -->
    <span class="fader-value">
      {{ displayValue }}
    </span>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { clamp, quantizeStep } from '@/utils/knob.utils'

  export type FaderOrientation = 'vertical' | 'horizontal'

  export interface DawFaderProps {
    min?: number
    max?: number
    step?: number
    label?: string
    showDb?: boolean
    defaultValue?: number
    orientation?: FaderOrientation
    disabled?: boolean
  }

  const props = withDefaults(defineProps<DawFaderProps>(), {
    min: 0,
    max: 1,
    step: 0.01,
    label: undefined,
    showDb: true,
    defaultValue: 0.75,
    orientation: 'vertical',
    disabled: false
  })

  const model = defineModel<number>({ required: true })
  const emit = defineEmits<{
    change: [value: number]
  }>()

  const trackRef = ref<HTMLElement | null>(null)
  const isDragging = ref(false)
  const dragStartX = ref(0)
  const dragStartY = ref(0)
  const dragStartValue = ref(0)

  const isHorizontal = computed(() => props.orientation === 'horizontal')

  const normalizedPercent = computed(() => {
    const range = props.max - props.min
    if (range <= 0) return 0
    const clamped = clamp(model.value, props.min, props.max)
    return ((clamped - props.min) / range) * 100
  })

  const fillStyle = computed(() =>
    isHorizontal.value ? { width: `${normalizedPercent.value}%` } : { height: `${normalizedPercent.value}%` }
  )

  const thumbStyle = computed(() =>
    isHorizontal.value ? { left: `${normalizedPercent.value}%` } : { bottom: `${normalizedPercent.value}%` }
  )

  const displayValue = computed(() => {
    if (!props.showDb) {
      return Math.round(model.value * 100).toString() + '%'
    }

    if (model.value <= 0.0001) {
      return '-inf dB'
    }

    // Standard audio amplitude to dB formula: 20 * log10(gain)
    const db = 20 * Math.log10(model.value)
    if (Math.abs(db) < 0.05) {
      return '0.0 dB'
    }
    return `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`
  })

  function updateValue(nextVal: number): void {
    const clamped = clamp(nextVal, props.min, props.max)
    const quantized = quantizeStep(clamped, props.step, props.min)
    if (quantized !== model.value) {
      model.value = quantized
      emit('change', quantized)
    }
  }

  function valueFromPointerPosition(clientX: number, clientY: number): number {
    if (!trackRef.value) return model.value
    const rect = trackRef.value.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return model.value
    const ratio = isHorizontal.value
      ? clamp((clientX - rect.left) / rect.width, 0, 1)
      : clamp((rect.bottom - clientY) / rect.height, 0, 1)
    return props.min + ratio * (props.max - props.min)
  }

  function onPointerDown(e: PointerEvent): void {
    if (props.disabled || e.button !== 0) return

    isDragging.value = true
    dragStartX.value = e.clientX
    dragStartY.value = e.clientY
    dragStartValue.value = model.value

    const target = e.currentTarget as HTMLElement
    if (target?.setPointerCapture) {
      target.setPointerCapture(e.pointerId)
    }

    // Direct click jump to position unless shift is held
    if (!e.shiftKey) {
      const clickedVal = valueFromPointerPosition(e.clientX, e.clientY)
      updateValue(clickedVal)
      dragStartValue.value = clickedVal
    }
  }

  function onPointerMove(e: PointerEvent): void {
    if (!isDragging.value || props.disabled || !trackRef.value) return

    const rect = trackRef.value.getBoundingClientRect()
    const trackSize = isHorizontal.value ? rect.width || 100 : rect.height || 96
    const fineFactor = e.shiftKey ? 0.2 : 1.0
    const deltaPx = isHorizontal.value ? e.clientX - dragStartX.value : dragStartY.value - e.clientY
    const range = props.max - props.min
    const deltaValue = ((deltaPx * fineFactor) / trackSize) * range

    updateValue(dragStartValue.value + deltaValue)
  }

  function onPointerUp(e: PointerEvent): void {
    if (!isDragging.value) return
    isDragging.value = false

    const target = e.currentTarget as HTMLElement
    if (target?.releasePointerCapture) {
      try {
        target.releasePointerCapture(e.pointerId)
      } catch {
        // Safe pointer capture release
      }
    }
  }

  function onDoubleClick(): void {
    if (props.disabled) return
    const fallback = props.defaultValue !== undefined ? props.defaultValue : props.min
    updateValue(clamp(fallback, props.min, props.max))
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (props.disabled) return

    const stepDelta = props.step > 0 ? props.step : 0.01
    const fineDelta = e.shiftKey ? stepDelta * 0.2 : stepDelta
    const bigStepDelta = stepDelta * 10

    let nextValue: number

    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        nextValue = model.value + fineDelta
        break
      case 'ArrowDown':
      case 'ArrowLeft':
        nextValue = model.value - fineDelta
        break
      case 'PageUp':
        nextValue = model.value + bigStepDelta
        break
      case 'PageDown':
        nextValue = model.value - bigStepDelta
        break
      case 'Home':
        nextValue = props.min
        break
      case 'End':
        nextValue = props.max
        break
      default:
        return
    }

    e.preventDefault()
    updateValue(nextValue)
  }
</script>
