<template>
  <section class="daw-module" :class="{ 'is-collapsed': !isOpen }">
    <header
      class="daw-module-header"
      :class="{
        collapsed: !isOpen,
        'cursor-pointer': collapsible,
        'cursor-default': !collapsible
      }"
      :role="collapsible ? 'button' : undefined"
      :aria-expanded="collapsible ? isOpen : undefined"
      :tabindex="collapsible ? 0 : undefined"
      @click="toggleCollapse"
      @keydown.enter.prevent="toggleCollapse"
      @keydown.space.prevent="toggleCollapse"
    >
      <div class="flex min-w-0 items-center gap-1.5">
        <ChevronDown
          v-if="collapsible"
          class="text-daw-text-muted h-3 w-3 shrink-0 transition-transform duration-150"
          :class="{ '-rotate-90': !isOpen }"
          aria-hidden="true"
        />
        <span v-if="roleDot && roleDot !== 'none'" class="role-dot" :class="`dot-${roleDot}`" aria-hidden="true" />
        <slot name="title">
          <span class="text-daw-text text-2xs truncate font-semibold tracking-wide uppercase">
            {{ title }}
          </span>
        </slot>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <slot name="badge">
          <span v-if="badge" class="text-micro font-mono" :class="badgeColorClass">
            {{ badge }}
          </span>
        </slot>
        <slot name="actions" />
      </div>
    </header>

    <div v-show="isOpen" class="daw-module-body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { ChevronDown } from '@lucide/vue'

  export type ModuleAccent = 'signal' | 'pulse' | 'chord' | 'muted' | 'none'

  interface Props {
    title?: string
    badge?: string
    badgeColor?: ModuleAccent
    roleDot?: ModuleAccent
    collapsible?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    title: '',
    badge: undefined,
    badgeColor: 'signal',
    roleDot: 'signal',
    collapsible: true
  })

  const isOpen = defineModel<boolean>({ default: true })

  const badgeColorClass = computed(() => {
    switch (props.badgeColor) {
      case 'pulse':
        return 'text-daw-pulse'
      case 'chord':
        return 'text-daw-chord'
      case 'muted':
        return 'text-daw-text-muted'
      case 'signal':
      default:
        return 'text-daw-signal'
    }
  })

  function toggleCollapse(): void {
    if (!props.collapsible) return
    isOpen.value = !isOpen.value
  }
</script>
