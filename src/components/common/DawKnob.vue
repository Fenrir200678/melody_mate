<template>
  <div class="daw-knob" :class="{ 'pointer-events-none opacity-50': disabled }" :aria-disabled="disabled">
    <!-- Parameter label (above the dial, device-panel style) -->
    <span v-if="label" class="knob-label">
      {{ label }}
    </span>

    <!-- Rotary dial -->
    <div
      class="knob-dial focus-visible:ring-daw-signal focus-visible:ring-1 focus-visible:outline-none"
      :data-size="size"
      role="slider"
      tabindex="0"
      :aria-label="label || 'Rotary knob'"
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
      <!-- SVG track & arc overlay -->
      <svg class="pointer-events-none absolute inset-0 h-full w-full" :viewBox="`0 0 ${viewBoxSize} ${viewBoxSize}`">
        <!-- Background track arc -->
        <path
          :d="trackArcPath"
          fill="none"
          class="stroke-daw-border"
          :stroke-width="strokeWidth"
          stroke-linecap="round"
        />

        <!-- Active sweep arc -->
        <path
          v-if="activeArcPath"
          :d="activeArcPath"
          fill="none"
          :class="variant === 'chord' ? 'stroke-daw-chord' : 'stroke-daw-signal'"
          :stroke-width="strokeWidth"
          stroke-linecap="round"
        />

        <!-- Indicator needle -->
        <line
          :x1="needleStart.x"
          :y1="needleStart.y"
          :x2="needleEnd.x"
          :y2="needleEnd.y"
          :class="variant === 'chord' ? 'stroke-daw-chord' : 'stroke-daw-signal'"
          :stroke-width="needleWidth"
          stroke-linecap="round"
        />
      </svg>
    </div>

    <!-- Mono value readout -->
    <span class="knob-value">
      {{ displayValue }}
    </span>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import {
    calculateDragValue,
    clamp,
    describeArc,
    formatKnobValue,
    KNOB_MAX_ANGLE,
    KNOB_MIN_ANGLE,
    polarToCartesian,
    quantizeStep,
    valueToAngle,
    type KnobCurve
  } from '@/utils/knob.utils'

  export type KnobSize = 'xs' | 'sm' | 'md'

  export interface DawKnobProps {
    min?: number
    max?: number
    step?: number
    defaultValue?: number
    label?: string
    unit?: string
    curve?: KnobCurve
    variant?: 'signal' | 'chord'
    precision?: number
    size?: KnobSize
    disabled?: boolean
    formatValue?: (value: number) => string
  }

  const props = withDefaults(defineProps<DawKnobProps>(), {
    min: 0,
    max: 100,
    step: 1,
    defaultValue: undefined,
    label: undefined,
    unit: undefined,
    curve: 'linear',
    variant: 'signal',
    precision: undefined,
    size: 'sm',
    disabled: false,
    formatValue: undefined
  })

  const model = defineModel<number>({ required: true })
  const emit = defineEmits<{
    change: [value: number]
    gestureStart: []
    gestureEnd: []
  }>()

  const isDragging = ref(false)
  const dragStartY = ref(0)
  const dragStartValue = ref(0)

  // Geometry: xs = 20px, sm = 26px, md = 32px dial diameter
  const viewBoxSize = computed(() => (props.size === 'xs' ? 20 : props.size === 'md' ? 32 : 26))
  const center = computed(() => viewBoxSize.value / 2)
  const strokeWidth = computed(() => (props.size === 'xs' ? 1.5 : props.size === 'md' ? 2.5 : 2))
  const radius = computed(() => center.value - strokeWidth.value / 2 - 1)
  const needleWidth = computed(() => (props.size === 'md' ? 2 : 1.5))

  const currentAngle = computed(() => {
    return valueToAngle(model.value, props.min, props.max, props.curve)
  })

  // Full 270° background track
  const trackArcPath = computed(() => {
    return describeArc(center.value, center.value, radius.value, KNOB_MIN_ANGLE, KNOB_MAX_ANGLE)
  })

  // Active value sweep
  const activeArcPath = computed(() => {
    if (currentAngle.value <= KNOB_MIN_ANGLE + 0.5) return ''
    return describeArc(center.value, center.value, radius.value, KNOB_MIN_ANGLE, currentAngle.value)
  })

  // Dial indicator needle coordinates
  const needleStart = computed(() => {
    return polarToCartesian(center.value, center.value, center.value - 7, currentAngle.value)
  })

  const needleEnd = computed(() => {
    return polarToCartesian(center.value, center.value, radius.value - 1.5, currentAngle.value)
  })

  // Display readout
  const displayValue = computed(() => {
    if (props.formatValue) {
      return props.formatValue(model.value)
    }
    return formatKnobValue(model.value, props.precision, props.unit)
  })

  function updateValue(nextVal: number): void {
    if (nextVal !== model.value) {
      model.value = nextVal
      emit('change', nextVal)
    }
  }

  function onPointerDown(e: PointerEvent): void {
    if (props.disabled || e.button !== 0) return

    isDragging.value = true
    emit('gestureStart')
    dragStartY.value = e.clientY
    dragStartValue.value = model.value

    const target = e.currentTarget as HTMLElement
    if (target?.setPointerCapture) {
      target.setPointerCapture(e.pointerId)
    }
  }

  function onPointerMove(e: PointerEvent): void {
    if (!isDragging.value || props.disabled) return

    const deltaY = dragStartY.value - e.clientY // Drag up to increase
    const nextVal = calculateDragValue({
      startValue: dragStartValue.value,
      deltaY,
      min: props.min,
      max: props.max,
      step: props.step,
      curve: props.curve,
      isFine: e.shiftKey
    })

    updateValue(nextVal)
  }

  function onPointerUp(e: PointerEvent): void {
    if (!isDragging.value) return
    isDragging.value = false
    emit('gestureEnd')

    const target = e.currentTarget as HTMLElement
    if (target?.releasePointerCapture) {
      try {
        target.releasePointerCapture(e.pointerId)
      } catch {
        // Pointer capture may have already been released
      }
    }
  }

  function onDoubleClick(): void {
    if (props.disabled) return
    const fallback = props.defaultValue !== undefined ? props.defaultValue : props.min
    emit('gestureStart')
    updateValue(clamp(fallback, props.min, props.max))
    emit('gestureEnd')
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (props.disabled) return

    const stepDelta = props.step > 0 ? props.step : 1
    const fineDelta = e.shiftKey ? Math.max(stepDelta * 0.2, 0.01) : stepDelta
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
    emit('gestureStart')
    const quantized = quantizeStep(nextValue, props.step, props.min)
    updateValue(clamp(quantized, props.min, props.max))
    emit('gestureEnd')
  }
</script>
