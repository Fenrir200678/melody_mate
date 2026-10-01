<template>
  <button
    type="button"
    class="inline-flex shrink-0 cursor-pointer items-center justify-center transition-all duration-100 ease-out select-none focus-visible:ring-1 focus-visible:outline-none active:scale-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-30"
    :class="[sizeClasses.button, variantClasses]"
    :disabled="disabled"
    :aria-disabled="disabled"
    :aria-pressed="active ? true : undefined"
    :aria-label="effectiveAriaLabel"
    :title="effectiveTitle"
    @click="onClick"
  >
    <slot>
      <component :is="icon" v-if="icon" aria-hidden="true" :class="sizeClasses.icon" />
    </slot>
  </button>
</template>

<script setup lang="ts">
  import { computed, type Component } from 'vue'
  import {
    getIconButtonSizeClasses,
    getIconButtonVariantClasses,
    resolveIconButtonAriaLabel,
    resolveIconButtonTitle,
    type DawIconButtonAppearance,
    type DawIconButtonSize,
    type DawIconButtonVariant
  } from '@/utils/icon-button.utils'

  export interface DawIconButtonProps {
    icon?: Component
    size?: DawIconButtonSize
    appearance?: DawIconButtonAppearance
    variant?: DawIconButtonVariant
    active?: boolean
    disabled?: boolean
    disabledReason?: string
    title?: string
    ariaLabel?: string
  }

  const props = withDefaults(defineProps<DawIconButtonProps>(), {
    icon: undefined,
    size: 'sm',
    appearance: 'ghost',
    variant: 'default',
    active: false,
    disabled: false,
    disabledReason: undefined,
    title: undefined,
    ariaLabel: undefined
  })

  const emit = defineEmits<{
    click: [event: MouseEvent]
  }>()

  const effectiveTitle = computed(() =>
    resolveIconButtonTitle(props.title, props.ariaLabel, props.disabled, props.disabledReason)
  )

  const effectiveAriaLabel = computed(() => resolveIconButtonAriaLabel(props.title, props.ariaLabel))

  const sizeClasses = computed(() => getIconButtonSizeClasses(props.size))

  const variantClasses = computed(() => getIconButtonVariantClasses(props.appearance, props.variant, props.active))

  function onClick(event: MouseEvent): void {
    if (!props.disabled) {
      emit('click', event)
    }
  }
</script>
