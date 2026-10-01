<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        :aria-label="title || 'Modal Dialog'"
        @pointerdown.self="onBackdropClick"
        @keydown="onKeyDown"
      >
        <div
          ref="modalBoxRef"
          class="bg-daw-surface border-daw-border rounded-panel text-daw-text font-ui relative flex max-h-[90vh] w-full flex-col overflow-hidden border shadow-2xl"
          :class="maxWidth"
          tabindex="-1"
        >
          <!-- Modal Header -->
          <div
            v-if="title || $slots.header"
            class="border-daw-border bg-daw-panel/50 flex items-center justify-between border-b px-5 py-3.5"
          >
            <slot name="header">
              <h3 class="text-daw-text text-sm font-semibold">
                {{ title }}
              </h3>
            </slot>

            <DawIconButton
              :icon="X"
              size="sm"
              appearance="ghost"
              aria-label="Close dialog"
              title="Close dialog"
              @click="close"
            />
          </div>

          <!-- Modal Body -->
          <div class="flex-1 overflow-y-auto px-5 py-4">
            <slot />
          </div>

          <!-- Modal Footer -->
          <div
            v-if="$slots.footer"
            class="border-daw-border bg-daw-panel/50 flex items-center justify-end gap-2 border-t px-5 py-3"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
  import { nextTick, ref, watch } from 'vue'
  import { X } from '@lucide/vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'

  export interface DawModalProps {
    title?: string
    closeOnBackdrop?: boolean
    closeOnEsc?: boolean
    maxWidth?: string
  }

  const isOpen = defineModel<boolean>({ default: false })

  const props = withDefaults(defineProps<DawModalProps>(), {
    title: undefined,
    closeOnBackdrop: true,
    closeOnEsc: true,
    maxWidth: 'max-w-lg'
  })

  const emit = defineEmits<{
    close: []
  }>()

  const modalBoxRef = ref<HTMLElement | null>(null)
  let previousActiveElement: HTMLElement | null = null

  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

  function close(): void {
    isOpen.value = false
    emit('close')
  }

  function onBackdropClick(): void {
    if (props.closeOnBackdrop) {
      close()
    }
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && props.closeOnEsc) {
      e.preventDefault()
      close()
      return
    }

    if (e.key === 'Tab' && modalBoxRef.value) {
      const focusable = Array.from(modalBoxRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null
      )

      if (focusable.length === 0) {
        e.preventDefault()
        return
      }

      const firstEl = focusable[0]
      const lastEl = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl?.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl?.focus()
      }
    }
  }

  watch(isOpen, async (open) => {
    if (open) {
      previousActiveElement = document.activeElement as HTMLElement | null
      await nextTick()
      if (modalBoxRef.value) {
        const focusable = modalBoxRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        if (focusable.length > 0) {
          focusable[0]?.focus()
        } else {
          modalBoxRef.value.focus()
        }
      }
    } else if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus()
      previousActiveElement = null
    }
  })
</script>
