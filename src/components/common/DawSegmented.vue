<template>
  <div
    class="daw-segmented"
    :class="[
      `size-${size}`,
      `btn-${variant}`,
      { 'is-disabled': disabled, 'is-grow': grow, 'is-wrap': wrap, 'w-full': grow }
    ]"
    role="radiogroup"
    :aria-label="ariaLabel"
    :aria-disabled="disabled"
    :title="title"
    @keydown="onKeyDown"
  >
    <button
      v-for="option in normalizedOptions"
      :key="String(option.value)"
      type="button"
      class="segmented-item focus-visible:ring-daw-signal inline-flex items-center justify-center focus-visible:ring-1 focus-visible:outline-none"
      :class="{ active: option.value === modelValue }"
      role="radio"
      :aria-checked="option.value === modelValue"
      :disabled="disabled"
      :tabindex="option.value === modelValue ? 0 : -1"
      :title="option.title || title"
      @click="selectOption(option.value)"
    >
      <span>{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts" generic="T">
  import { computed } from 'vue'
  import {
    resolveSegmentedIndex,
    resolveSegmentedKey,
    type SegmentOption,
    type SegmentOptionObject,
    type SegmentedSize
  } from '@/utils/segmented.utils'

  export type { SegmentOption, SegmentOptionObject, SegmentedSize }

  export interface DawSegmentedProps<V> {
    modelValue: V
    options: readonly SegmentOption<V>[]
    size?: SegmentedSize
    /** Track accent: signal (melody), pulse (rhythm), chord (harmony). */
    variant?: 'signal' | 'pulse' | 'chord'
    /** Stretch every segment to an equal share of the control width. */
    grow?: boolean
    /** Let segments wrap onto a second row when the labels do not fit. */
    wrap?: boolean
    disabled?: boolean
    /** Tooltip explaining why the control is unavailable, e.g. "Overridden by Call & Response". */
    disabledReason?: string
    ariaLabel?: string
  }

  const props = withDefaults(defineProps<DawSegmentedProps<T>>(), {
    size: 'sm',
    variant: 'signal',
    grow: false,
    wrap: false,
    disabled: false,
    disabledReason: undefined,
    ariaLabel: undefined
  })

  const emit = defineEmits<{
    'update:modelValue': [value: T]
  }>()

  interface NormalizedOption {
    label: string
    value: T
    title?: string
  }

  const normalizedOptions = computed<NormalizedOption[]>(() =>
    props.options.map((opt) => (typeof opt === 'string' ? { label: opt, value: opt as unknown as T } : opt))
  )

  const title = computed(() => (props.disabled ? props.disabledReason : undefined))

  function selectOption(val: T): void {
    if (props.disabled || val === props.modelValue) return
    emit('update:modelValue', val)
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (props.disabled) return

    const currentIndex = normalizedOptions.value.findIndex((o) => o.value === props.modelValue)
    const nextIndex = resolveSegmentedIndex(
      resolveSegmentedKey(event.key),
      currentIndex,
      normalizedOptions.value.length
    )
    if (nextIndex === null) return

    event.preventDefault()
    const target = normalizedOptions.value[nextIndex]
    if (target) {
      selectOption(target.value)
    }
  }
</script>
