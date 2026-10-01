<template>
  <div class="flex w-full items-center gap-1" :aria-label="label ?? 'Preset selector'">
    <!-- Previous Preset Button -->
    <button
      type="button"
      class="border-daw-border bg-daw-surface text-daw-text-muted hover:bg-daw-panel hover:text-daw-text rounded-control flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      :disabled="disabled || presets.length <= 1"
      title="Previous preset"
      aria-label="Previous preset"
      @click="selectPrev"
    >
      <ChevronLeft class="h-3 w-3" aria-hidden="true" />
    </button>

    <!-- Center Display & Dropdown Trigger -->
    <DawPopover
      v-model:open="isPopoverOpen"
      class="min-w-0 flex-1"
      content-class="w-full min-w-72 max-w-sm"
      match-trigger-width
      :side-offset="4"
      :disabled="disabled"
    >
      <template #default="{ isOpen, toggle }">
        <button
          type="button"
          class="border-daw-border bg-daw-surface hover:bg-daw-panel/80 rounded-control group text-2xs flex h-6 w-full min-w-0 cursor-pointer items-center justify-between gap-1 border px-1.5 transition-colors focus:outline-none"
          :class="[
            isOpen
              ? variant === 'chord'
                ? 'border-daw-chord bg-daw-panel ring-daw-chord/30 ring-1'
                : 'border-daw-signal bg-daw-panel ring-daw-signal/30 ring-1'
              : '',
            variant === 'chord' ? 'focus-visible:border-daw-chord' : 'focus-visible:border-daw-signal'
          ]"
          :aria-expanded="isOpen"
          aria-haspopup="listbox"
          @click="toggle"
          @keydown.down.prevent="isOpen ? undefined : toggle()"
          @keydown.up.prevent="isOpen ? undefined : toggle()"
        >
          <div class="flex min-w-0 items-center gap-1.5">
            <span
              class="h-1.5 w-1.5 shrink-0 rounded-full"
              :class="variant === 'chord' ? 'bg-daw-chord' : 'bg-daw-signal'"
              aria-hidden="true"
            />
            <span class="text-daw-text truncate font-medium">
              {{ currentPreset?.name ?? 'Select sound...' }}
            </span>
          </div>

          <div class="flex shrink-0 items-center gap-1">
            <ChevronDown
              class="text-daw-text-muted h-3 w-3 transition-transform duration-150"
              :class="{ 'text-daw-text rotate-180': isOpen }"
              aria-hidden="true"
            />
          </div>
        </button>
      </template>

      <template #content="{ close }">
        <div role="listbox" class="text-2xs max-h-64 w-full overflow-y-auto p-1" tabindex="-1">
          <div
            v-for="preset in presets"
            :key="preset.id"
            role="option"
            :aria-selected="preset.id === modelValue"
            class="rounded-control group flex cursor-pointer flex-col gap-0.5 px-2 py-1.5 transition-colors"
            :class="[
              preset.id === modelValue
                ? variant === 'chord'
                  ? 'bg-daw-chord/15 text-daw-chord font-medium'
                  : 'bg-daw-signal/15 text-daw-signal font-medium'
                : 'text-daw-text hover:bg-daw-panel hover:text-daw-text'
            ]"
            @click="selectPreset(preset.id, close)"
          >
            <div class="flex items-center justify-between gap-1">
              <div class="flex min-w-0 items-center gap-1.5">
                <Check
                  v-if="preset.id === modelValue"
                  class="h-3 w-3 shrink-0"
                  :class="variant === 'chord' ? 'text-daw-chord' : 'text-daw-signal'"
                  aria-hidden="true"
                />
                <span v-else class="h-3 w-3 shrink-0" aria-hidden="true" />
                <span class="truncate font-semibold">{{ preset.name }}</span>
              </div>
              <span
                v-if="preset.synthType"
                class="bg-daw-bg/80 text-daw-text-muted text-micro shrink-0 rounded px-1.5 py-0.5 font-mono"
              >
                {{ preset.synthType }}
              </span>
            </div>
            <p v-if="preset.description" class="text-daw-text-muted text-micro line-clamp-2 pl-4.5 leading-snug">
              {{ preset.description }}
            </p>
          </div>
        </div>
      </template>
    </DawPopover>

    <!-- Next Preset Button -->
    <button
      type="button"
      class="border-daw-border bg-daw-surface text-daw-text-muted hover:bg-daw-panel hover:text-daw-text rounded-control flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      :disabled="disabled || presets.length <= 1"
      title="Next preset"
      aria-label="Next preset"
      @click="selectNext"
    >
      <ChevronRight class="h-3 w-3" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { Check, ChevronDown, ChevronLeft, ChevronRight } from '@lucide/vue'
  import DawPopover from './DawPopover.vue'

  export interface PresetItem {
    id: string
    name: string
    synthType?: string
    description?: string
  }

  interface Props {
    presets: PresetItem[]
    variant?: 'signal' | 'chord'
    label?: string
    disabled?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    variant: 'signal',
    label: undefined,
    disabled: false
  })

  const modelValue = defineModel<string>({ required: true })
  const isPopoverOpen = ref(false)

  const currentIndex = computed(() => props.presets.findIndex((p) => p.id === modelValue.value))
  const currentPreset = computed(() => props.presets[currentIndex.value] ?? props.presets[0])

  function selectPrev(): void {
    if (props.presets.length === 0) return
    const idx = currentIndex.value
    const nextIdx = idx <= 0 ? props.presets.length - 1 : idx - 1
    modelValue.value = props.presets[nextIdx].id
  }

  function selectNext(): void {
    if (props.presets.length === 0) return
    const idx = currentIndex.value
    const nextIdx = idx >= props.presets.length - 1 ? 0 : idx + 1
    modelValue.value = props.presets[nextIdx].id
  }

  function selectPreset(id: string, close: () => void): void {
    modelValue.value = id
    close()
  }
</script>
