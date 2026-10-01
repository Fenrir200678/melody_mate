<template>
  <DawModal v-model="isOpen" title="Save custom rhythm" max-width="max-w-sm">
    <form id="save-rhythm-form" class="flex flex-col gap-2" novalidate @submit.prevent="saveAsNew">
      <label for="new-rhythm-name" class="text-daw-text text-xs">Rhythm name (optional)</label>
      <input
        id="new-rhythm-name"
        v-model="newPresetName"
        type="text"
        maxlength="60"
        :placeholder="suggestedName"
        class="bg-daw-panel border-daw-border text-daw-text focus-visible:outline-daw-pulse rounded-control h-7 border px-2 text-xs focus-visible:outline"
        :aria-invalid="!!saveNameError"
        :aria-describedby="saveNameError ? 'save-rhythm-error save-rhythm-hint' : 'save-rhythm-hint'"
      />
      <p id="save-rhythm-hint" class="text-daw-text-muted text-micro">Leave blank to save as “{{ suggestedName }}”.</p>
      <p v-if="saveNameError" id="save-rhythm-error" class="text-micro text-daw-danger" role="alert">
        {{ saveNameError }}
      </p>
    </form>
    <template #footer>
      <DawButton appearance="surface" size="md" @click="isOpen = false">Cancel</DawButton>
      <DawButton type="submit" form="save-rhythm-form" appearance="primary" variant="signal" size="md">
        Save rhythm
      </DawButton>
    </template>
  </DawModal>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawModal from '@/components/common/DawModal.vue'
  import { suggestCustomRhythmName } from '@/core/rhythm/suggest-custom-rhythm-name'
  import { useMelodyStore } from '@/stores/melody.store'
  import { useRhythmStore } from '@/stores/rhythm.store'

  const isOpen = defineModel<boolean>({ default: false })

  const emit = defineEmits<{
    saved: [presetName: string]
  }>()

  const store = useRhythmStore()
  const melodyStore = useMelodyStore()

  const pattern = computed(() => store.pattern)
  const newPresetName = ref('')
  const saveNameError = ref('')

  const suggestedName = computed(() =>
    suggestCustomRhythmName(
      pattern.value,
      store.savedPresets.map((preset) => preset.name)
    )
  )

  watch(isOpen, (open) => {
    if (open) {
      newPresetName.value = ''
      saveNameError.value = ''
    }
  })

  function saveAsNew(): void {
    const saved = store.savePreset(newPresetName.value)
    if (!saved) {
      saveNameError.value = store.error ?? 'Could not save this rhythm.'
      return
    }
    isOpen.value = false
    melodyStore.setRhythmMode('custom')
    emit('saved', saved.name)
  }
</script>
