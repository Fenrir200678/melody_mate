<template>
  <div class="ml-auto">
    <DawButton
      size="sm"
      appearance="ghost"
      variant="danger"
      :disabled="disabled"
      title="Clear all takes"
      @click="isOpen = true"
    >
      Clear all takes
    </DawButton>

    <DawModal v-model="isOpen" title="Clear all takes?" max-width="max-w-md">
      <p class="text-daw-text-muted text-xs leading-relaxed">
        This will delete every take, including locked takes. This action cannot be undone. Your piano roll will be kept.
      </p>

      <template #footer>
        <DawButton size="md" appearance="surface" variant="default" @click="isOpen = false"> Cancel </DawButton>

        <DawButton size="md" appearance="surface" variant="danger" @click="confirmClearAll">
          Clear all takes
        </DawButton>
      </template>
    </DawModal>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawModal from '@/components/common/DawModal.vue'

  withDefaults(
    defineProps<{
      disabled?: boolean
    }>(),
    {
      disabled: false
    }
  )

  const emit = defineEmits<{
    confirm: []
  }>()

  const isOpen = ref(false)

  function confirmClearAll(): void {
    isOpen.value = false
    emit('confirm')
  }
</script>
