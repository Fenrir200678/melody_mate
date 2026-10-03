<template>
  <header class="border-daw-border flex h-9 shrink-0 items-center justify-between gap-3 border-b px-3">
    <!-- Left: Dock title & view switch -->
    <div class="flex min-w-0 items-center gap-3">
      <div class="flex shrink-0 items-center gap-1.5">
        <AudioLines class="text-daw-signal h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <h2 id="sound-mix-title" class="text-daw-text text-2xs font-bold tracking-wider uppercase">Sound &amp; Mix</h2>
      </div>

      <!-- Segmented View Switch -->
      <DawSegmented
        :model-value="view"
        :options="VIEW_OPTIONS"
        size="xs"
        variant="signal"
        aria-label="Sound and Mix dock view"
        @update:model-value="$emit('update:view', $event)"
      />
    </div>

    <!-- Right: Status badge & close button -->
    <div class="flex items-center gap-2">
      <MidiConnectionStatus compact />
      <div class="bg-daw-border h-4 w-px" aria-hidden="true" />
      <DawIconButton
        :icon="X"
        size="sm"
        appearance="ghost"
        title="Close Sound & Mix (S / Esc)"
        aria-label="Close Sound and Mix"
        @click="$emit('close')"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
  import { AudioLines, X } from '@lucide/vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import DawSegmented from '@/components/common/DawSegmented.vue'
  import MidiConnectionStatus from './MidiConnectionStatus.vue'
  import type { SoundDockView } from '@/config/ui-defaults'

  defineProps<{
    view: SoundDockView
  }>()

  defineEmits<{
    'update:view': [view: SoundDockView]
    close: []
  }>()

  const VIEW_OPTIONS = [
    { label: 'Sound & Mix', value: 'sound' as const },
    { label: 'MIDI Output', value: 'midi' as const }
  ]
</script>
