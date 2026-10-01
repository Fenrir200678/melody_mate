<template>
  <button
    type="button"
    :role="appearance === 'button' ? undefined : appearance === 'switch' ? 'switch' : 'checkbox'"
    :aria-checked="appearance !== 'button' ? model : undefined"
    :aria-pressed="appearance === 'button' ? model : undefined"
    :aria-label="effectiveAriaLabel"
    :aria-disabled="disabled"
    :disabled="disabled"
    :title="effectiveTitle"
    class="daw-toggle group inline-flex items-center select-none"
    :class="rootClasses"
    @click="toggle"
    @keydown.space.prevent="toggle"
    @keydown.enter.prevent="toggle"
  >
    <!-- Switch Appearance -->
    <template v-if="appearance === 'switch'">
      <!-- Left Label -->
      <span v-if="(label || $slots.default) && labelPosition === 'left'" class="truncate" :class="labelClasses">
        <slot>{{ effectiveLabel }}</slot>
      </span>

      <!-- Hardware Switch Track & Thumb -->
      <span
        class="daw-switch-track relative inline-flex shrink-0 items-center rounded-full transition-all duration-150 ease-out"
        :class="[trackSizeClasses, trackColorClasses, `variant-${variant}`, { 'is-active': model }]"
      >
        <span
          class="inline-block rounded-full bg-white shadow-sm transition-transform duration-150 ease-out"
          :class="[thumbSizeClasses, thumbPositionClasses]"
        />
      </span>

      <!-- Right Label -->
      <span v-if="(label || $slots.default) && labelPosition === 'right'" class="truncate" :class="labelClasses">
        <slot>{{ effectiveLabel }}</slot>
      </span>
    </template>

    <!-- Button / Latching Push Appearance -->
    <template v-else-if="appearance === 'button'">
      <!-- LED Indicator Dot -->
      <span
        v-if="showDot"
        class="h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-150"
        :class="ledDotClasses"
      />

      <!-- Optional Icon -->
      <component :is="icon" v-if="icon" class="shrink-0" :class="iconSizeClasses" />

      <!-- Label content (with container query support for shortLabel) -->
      <div v-if="shortLabel" class="daw-toggle-responsive min-w-0 flex-1 truncate text-left">
        <span class="daw-toggle-full truncate">{{ label }}</span>
        <span class="daw-toggle-short hidden truncate">{{ shortLabel }}</span>
      </div>
      <span v-else-if="label || $slots.default" class="min-w-0 flex-1 truncate text-left">
        <slot>{{ effectiveLabel }}</slot>
      </span>

      <!-- Optional Status Text (On / Off) -->
      <span v-if="showStatusText" class="text-micro ml-1.5 shrink-0 font-mono" :class="statusTextClasses">
        {{ currentStatusLabel }}
      </span>
    </template>

    <!-- Checkbox Appearance -->
    <template v-else-if="appearance === 'checkbox'">
      <!-- Left Label -->
      <span v-if="(label || $slots.default) && labelPosition === 'left'" class="truncate" :class="labelClasses">
        <slot>{{ effectiveLabel }}</slot>
      </span>

      <!-- Custom DAW Checkbox Box -->
      <span
        class="relative inline-flex shrink-0 items-center justify-center border transition-all duration-150 ease-out"
        :class="[checkboxBoxClasses, checkboxColorClasses]"
      >
        <Check v-if="model" class="stroke-3" :class="checkIconClasses" />
      </span>

      <!-- Right Label -->
      <span v-if="(label || $slots.default) && labelPosition === 'right'" class="truncate" :class="labelClasses">
        <slot>{{ effectiveLabel }}</slot>
      </span>
    </template>
  </button>
</template>

<script setup lang="ts">
  import { computed, type Component } from 'vue'
  import { Check } from '@lucide/vue'
  import {
    resolveToggleAriaLabel,
    resolveToggleStatus,
    resolveToggleTitle,
    type DawToggleAppearance,
    type DawToggleSize,
    type DawToggleVariant,
    type ToggleStatusLabels
  } from '@/utils/toggle.utils'

  export type { DawToggleAppearance, DawToggleSize, DawToggleVariant, ToggleStatusLabels }

  export interface DawToggleProps {
    appearance?: DawToggleAppearance
    variant?: DawToggleVariant
    size?: DawToggleSize
    label?: string
    shortLabel?: string
    labelPosition?: 'left' | 'right'
    justifyBetween?: boolean
    fullWidth?: boolean
    showDot?: boolean
    showStatusText?: boolean
    statusLabels?: ToggleStatusLabels
    disabled?: boolean
    disabledReason?: string
    title?: string
    ariaLabel?: string
    icon?: Component
  }

  const props = withDefaults(defineProps<DawToggleProps>(), {
    appearance: 'switch',
    variant: 'signal',
    size: 'sm',
    label: undefined,
    shortLabel: undefined,
    labelPosition: 'right',
    justifyBetween: false,
    fullWidth: undefined,
    showDot: true,
    showStatusText: false,
    statusLabels: () => ({ on: 'On', off: 'Off' }),
    disabled: false,
    disabledReason: undefined,
    title: undefined,
    ariaLabel: undefined,
    icon: undefined
  })

  const emit = defineEmits<{
    change: [value: boolean]
  }>()

  const model = defineModel<boolean>({ default: false })

  const isFullWidth = computed(() => {
    if (props.fullWidth !== undefined) return props.fullWidth
    return props.appearance === 'button'
  })

  const effectiveTitle = computed(() =>
    resolveToggleTitle(props.label, props.title, props.disabled, props.disabledReason)
  )

  const effectiveAriaLabel = computed(() => resolveToggleAriaLabel(props.label, props.ariaLabel))

  const effectiveLabel = computed(() => props.label ?? '')

  const currentStatusLabel = computed(() => resolveToggleStatus(model.value, props.statusLabels))

  function toggle(): void {
    if (props.disabled) return
    model.value = !model.value
    emit('change', model.value)
  }

  /* Focus ring classes by variant */
  const focusRingClasses = computed(() => {
    switch (props.variant) {
      case 'pulse':
        return 'focus-visible:ring-daw-pulse'
      case 'chord':
        return 'focus-visible:ring-daw-chord'
      case 'danger':
        return 'focus-visible:ring-daw-danger'
      default:
        return 'focus-visible:ring-daw-signal'
    }
  })

  /* Root classes */
  const rootClasses = computed(() => {
    const list: string[] = ['focus-visible:outline-none focus-visible:ring-1', focusRingClasses.value]

    if (props.disabled) {
      list.push('cursor-not-allowed opacity-45 pointer-events-none')
    } else {
      list.push('cursor-pointer')
    }

    if (props.appearance === 'button') {
      list.push('rounded-control border transition-all duration-150 ease-out font-medium')
      if (isFullWidth.value) list.push('w-full')

      // Button sizing & padding
      if (props.size === 'xs') {
        list.push('h-5 px-1.5 gap-1.5 text-micro')
      } else if (props.size === 'md') {
        list.push('h-7 px-2.5 gap-2 text-xs')
      } else {
        list.push('h-6 px-2 gap-1.5 text-2xs')
      }

      // Button surface active/inactive colors
      if (model.value) {
        switch (props.variant) {
          case 'pulse':
            list.push('bg-daw-pulse/15 border-daw-pulse text-daw-text')
            break
          case 'chord':
            list.push('bg-daw-chord/15 border-daw-chord text-daw-text')
            break
          case 'danger':
            list.push('bg-daw-danger/15 border-daw-danger text-daw-text')
            break
          default:
            list.push('bg-daw-signal/15 border-daw-signal text-daw-text font-semibold')
            break
        }
      } else {
        list.push(
          'bg-daw-surface border-daw-border text-daw-text-muted hover:text-daw-text hover:bg-daw-surface-elevated hover:border-daw-border/80'
        )
      }
    } else {
      // Switch or Checkbox wrapper sizing
      if (props.size === 'xs') {
        list.push('h-5 gap-1.5')
      } else if (props.size === 'md') {
        list.push('h-7 gap-2')
      } else {
        list.push('h-6 gap-2')
      }

      if (props.justifyBetween) {
        list.push('w-full justify-between')
      } else if (isFullWidth.value) {
        list.push('w-full')
      }
    }

    return list
  })

  /* Switch Track dimensions */
  const trackSizeClasses = computed(() => {
    if (props.size === 'xs') return 'h-3.5 w-6 p-0.5'
    if (props.size === 'md') return 'h-5 w-9 p-0.5'
    return 'h-4 w-7 p-0.5'
  })

  /* Switch Track colors */
  const trackColorClasses = computed(() => {
    if (!model.value) {
      return 'bg-daw-surface border border-daw-border group-hover:border-daw-text-muted/60'
    }
    switch (props.variant) {
      case 'pulse':
        return 'bg-daw-pulse border border-daw-pulse/80'
      case 'chord':
        return 'bg-daw-chord border border-daw-chord/80'
      case 'danger':
        return 'bg-daw-danger border border-daw-danger/80'
      default:
        return 'bg-daw-signal border border-daw-signal/80'
    }
  })

  /* Switch Thumb dimensions */
  const thumbSizeClasses = computed(() => {
    if (props.size === 'xs') return 'h-2.5 w-2.5'
    if (props.size === 'md') return 'h-4 w-4'
    return 'h-3 w-3'
  })

  /* Switch Thumb translation & colors */
  const thumbPositionClasses = computed(() => {
    if (!model.value) {
      return 'translate-x-0 bg-daw-text-muted/60 group-hover:bg-daw-text-muted'
    }
    if (props.size === 'xs') return 'translate-x-2.5'
    if (props.size === 'md') return 'translate-x-4'
    return 'translate-x-3'
  })

  /* Button LED Dot classes */
  const ledDotClasses = computed(() => {
    if (!model.value) {
      return 'bg-daw-border group-hover:bg-daw-text-muted/40'
    }
    switch (props.variant) {
      case 'pulse':
        return 'bg-daw-pulse shadow-[0_0_6px_var(--color-daw-pulse)]'
      case 'chord':
        return 'bg-daw-chord shadow-[0_0_6px_var(--color-daw-chord)]'
      case 'danger':
        return 'bg-daw-danger shadow-[0_0_6px_var(--color-daw-danger)]'
      default:
        return 'bg-daw-signal shadow-[0_0_6px_var(--color-daw-signal)]'
    }
  })

  /* Button Status text classes */
  const statusTextClasses = computed(() => {
    if (!model.value) return 'text-daw-text-muted'
    switch (props.variant) {
      case 'pulse':
        return 'text-daw-pulse font-semibold'
      case 'chord':
        return 'text-daw-chord font-semibold'
      case 'danger':
        return 'text-daw-danger font-semibold'
      default:
        return 'text-daw-signal font-semibold'
    }
  })

  /* Checkbox Box dimensions */
  const checkboxBoxClasses = computed(() => {
    if (props.size === 'xs') return 'h-3.5 w-3.5 rounded-chip'
    if (props.size === 'md') return 'h-5 w-5 rounded-control'
    return 'h-4 w-4 rounded-chip'
  })

  /* Checkbox Box colors */
  const checkboxColorClasses = computed(() => {
    if (!model.value) {
      return 'bg-daw-surface border-daw-border group-hover:border-daw-text-muted/60'
    }
    switch (props.variant) {
      case 'pulse':
        return 'bg-daw-pulse border-daw-pulse text-daw-bg shadow-[0_0_6px_rgba(47,217,185,0.3)]'
      case 'chord':
        return 'bg-daw-chord border-daw-chord text-white shadow-[0_0_6px_rgba(155,107,255,0.3)]'
      case 'danger':
        return 'bg-daw-danger border-daw-danger text-white shadow-[0_0_6px_rgba(239,125,134,0.3)]'
      default:
        return 'bg-daw-signal border-daw-signal text-white shadow-[0_0_6px_rgba(91,141,255,0.3)]'
    }
  })

  /* Check icon dimensions */
  const checkIconClasses = computed(() => {
    if (props.size === 'xs') return 'h-2.5 w-2.5'
    if (props.size === 'md') return 'h-3.5 w-3.5'
    return 'h-3 w-3'
  })

  /* Icon size inside button */
  const iconSizeClasses = computed(() => {
    if (props.size === 'xs') return 'h-3 w-3'
    if (props.size === 'md') return 'h-4 w-4'
    return 'h-3.5 w-3.5'
  })

  /* Label classes for Switch & Checkbox */
  const labelClasses = computed(() => {
    const list: string[] = ['transition-colors']
    if (props.size === 'xs') {
      list.push('text-micro')
    } else if (props.size === 'md') {
      list.push('text-xs')
    } else {
      list.push('text-2xs')
    }

    if (model.value) {
      list.push('text-daw-text font-medium')
    } else {
      list.push('text-daw-text-muted group-hover:text-daw-text')
    }
    return list
  })
</script>
