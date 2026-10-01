<template>
  <div class="bg-daw-surface rounded-chip border-daw-border flex items-center border">
    <button
      type="button"
      class="text-daw-text-muted hover:text-daw-text flex cursor-pointer items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-30"
      :class="buttonClass"
      :disabled="isDecrementDisabled"
      :title="decrementTitle"
      :aria-label="decrementTitle"
      @click="onDecrement"
    >
      <Minus :class="iconClass" />
    </button>

    <slot name="value">
      <span class="text-daw-text-muted text-micro px-1 text-center font-mono">{{ modelValue }}</span>
    </slot>

    <button
      type="button"
      class="text-daw-text-muted hover:text-daw-text flex cursor-pointer items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-30"
      :class="buttonClass"
      :disabled="isIncrementDisabled"
      :title="incrementTitle"
      :aria-label="incrementTitle"
      @click="onIncrement"
    >
      <Plus :class="iconClass" />
    </button>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Minus, Plus } from '@lucide/vue'

  export interface DawStepperProps {
    /** Applied to the model when bound; ignored in intent-only usage. */
    step?: number
    min?: number
    max?: number
    /** xs = 20px chip, sm = 24px control, matching the DAW control height scale. */
    size?: 'xs' | 'sm'
    /** Overrides the derived bounds, for steppers that emit intents without a model. */
    decrementDisabled?: boolean
    incrementDisabled?: boolean
    decrementTitle?: string
    incrementTitle?: string
  }

  const props = withDefaults(defineProps<DawStepperProps>(), {
    step: 1,
    min: undefined,
    max: undefined,
    size: 'xs',
    decrementDisabled: false,
    incrementDisabled: false,
    decrementTitle: 'Decrease',
    incrementTitle: 'Increase'
  })

  const emit = defineEmits<{
    decrement: []
    increment: []
  }>()

  /** Optional on purpose: intent-only steppers (octave transpose, zoom) bind no value. */
  const modelValue = defineModel<number | undefined>({ default: undefined })

  const buttonClass = computed(() => (props.size === 'sm' ? 'h-6 w-6' : 'h-5 w-5'))
  const iconClass = computed(() => (props.size === 'sm' ? 'h-3 w-3' : 'h-2.5 w-2.5'))

  const isDecrementDisabled = computed(
    () =>
      props.decrementDisabled ||
      (modelValue.value !== undefined && props.min !== undefined && modelValue.value <= props.min)
  )

  const isIncrementDisabled = computed(
    () =>
      props.incrementDisabled ||
      (modelValue.value !== undefined && props.max !== undefined && modelValue.value >= props.max)
  )

  function onDecrement(): void {
    if (modelValue.value !== undefined) {
      modelValue.value -= props.step
    }
    emit('decrement')
  }

  function onIncrement(): void {
    if (modelValue.value !== undefined) {
      modelValue.value += props.step
    }
    emit('increment')
  }
</script>
