<template>
  <button
    :type="type"
    class="shrink-0 cursor-pointer items-center font-medium transition-all duration-100 ease-out select-none focus-visible:ring-1 focus-visible:outline-none active:scale-95 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-30"
    :class="[layoutClasses, sizeClasses.button, variantClasses]"
    :disabled="disabled"
    :aria-disabled="disabled"
    :aria-pressed="active ? true : undefined"
    :aria-label="ariaLabel"
    :title="effectiveTitle"
    @click="$emit('click', $event)"
  >
    <component :is="icon" v-if="icon" aria-hidden="true" :class="sizeClasses.icon" />
    <slot />
  </button>
</template>

<script setup lang="ts">
  import { computed, type Component } from 'vue'
  import {
    getButtonLayoutClasses,
    getButtonSizeClasses,
    getButtonVariantClasses,
    resolveButtonTitle,
    type DawButtonAlign,
    type DawButtonAppearance,
    type DawButtonSize,
    type DawButtonVariant
  } from '@/utils/button.utils'

  export interface DawButtonProps {
    icon?: Component
    size?: DawButtonSize
    appearance?: DawButtonAppearance
    variant?: DawButtonVariant
    active?: boolean
    disabled?: boolean
    disabledReason?: string
    title?: string
    ariaLabel?: string
    type?: 'button' | 'submit' | 'reset'
    block?: boolean
    align?: DawButtonAlign
    autoHeight?: boolean
  }

  const props = withDefaults(defineProps<DawButtonProps>(), {
    icon: undefined,
    size: 'sm',
    appearance: 'surface',
    variant: 'default',
    active: false,
    disabled: false,
    disabledReason: undefined,
    title: undefined,
    ariaLabel: undefined,
    type: 'button',
    block: false,
    align: undefined,
    autoHeight: false
  })

  defineEmits<{
    click: [event: MouseEvent]
  }>()

  const layoutClasses = computed(() => getButtonLayoutClasses(props.block, props.align))
  const sizeClasses = computed(() => getButtonSizeClasses(props.size, props.autoHeight))
  const variantClasses = computed(() => getButtonVariantClasses(props.appearance, props.variant, props.active))
  const effectiveTitle = computed(() =>
    resolveButtonTitle(props.title, props.ariaLabel, props.disabled, props.disabledReason)
  )
</script>
