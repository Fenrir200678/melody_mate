<template>
  <div class="flex items-center gap-1">
    <DawIconButton
      :icon="ChevronLeft"
      size="sm"
      appearance="ghost"
      :disabled="!canMoveLeft"
      title="Move chord left"
      aria-label="Move chord left"
      @click="emit('moveLeft')"
    />

    <DawIconButton
      :icon="ChevronRight"
      size="sm"
      appearance="ghost"
      :disabled="!canMoveRight"
      title="Move chord right"
      aria-label="Move chord right"
      @click="emit('moveRight')"
    />

    <DawIconButton
      :icon="Copy"
      size="sm"
      appearance="ghost"
      variant="signal"
      title="Duplicate chord"
      aria-label="Duplicate chord"
      @click="emit('duplicate')"
    />

    <DawIconButton
      :icon="Trash2"
      size="sm"
      appearance="ghost"
      variant="danger"
      title="Remove chord (Delete / Backspace)"
      aria-label="Remove chord"
      @click="emit('remove')"
    />
  </div>
</template>

<script setup lang="ts">
  import { ChevronLeft, ChevronRight, Copy, Trash2 } from '@lucide/vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'

  defineProps<{
    canMoveLeft: boolean
    canMoveRight: boolean
  }>()

  const emit = defineEmits<{
    moveLeft: []
    moveRight: []
    duplicate: []
    remove: []
  }>()
</script>
