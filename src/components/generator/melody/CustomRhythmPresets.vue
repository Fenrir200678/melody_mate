<template>
  <div class="flex flex-col gap-1" aria-label="Saved custom rhythms">
    <div class="flex h-5 items-center justify-between px-1">
      <span class="text-daw-text-muted text-micro">Saved rhythms</span>
      <span class="text-daw-text-muted text-micro font-mono">{{ rhythmStore.savedPresets.length }}</span>
    </div>
    <p v-if="!rhythmStore.savedPresets.length" class="text-daw-text-muted text-micro px-1 py-1">
      No saved rhythms yet. Create one in Rhythm Studio.
    </p>
    <ul v-else class="max-h-36 overflow-y-auto" aria-label="Saved custom rhythms">
      <li v-for="preset in rhythmStore.savedPresets" :key="preset.id" class="group flex h-7 items-center">
        <DawButton
          size="sm"
          appearance="ghost"
          variant="pulse"
          block
          align="between"
          :active="rhythmStore.activeSavedPresetId === preset.id"
          class="min-w-0 flex-1 px-2"
          :title="`Open ${preset.name} in Rhythm Studio`"
          @click="openPreset(preset.id)"
        >
          <span class="min-w-0 flex-1 truncate text-left">{{ preset.name }}</span>
          <span class="shrink-0 font-mono opacity-70"
            >{{ preset.pattern.bars }}b · {{ preset.pattern.events.length }}</span
          >
        </DawButton>
        <DawIconButton
          :icon="Pencil"
          size="sm"
          appearance="ghost"
          variant="pulse"
          :aria-label="`Rename ${preset.name}`"
          :title="`Rename ${preset.name}`"
          @click="beginRename(preset.id)"
        />
        <DawIconButton
          :icon="Trash2"
          size="sm"
          appearance="ghost"
          variant="danger"
          :aria-label="`Delete ${preset.name}`"
          :title="`Delete ${preset.name}`"
          @click="pendingDeleteId = preset.id"
        />
      </li>
    </ul>
    <p v-if="rhythmStore.error" class="text-micro text-daw-danger px-1" role="alert">{{ rhythmStore.error }}</p>
  </div>

  <DawModal v-model="isRenameOpen" title="Rename rhythm" max-width="max-w-sm">
    <form id="rename-rhythm-form" class="flex flex-col gap-2" novalidate @submit.prevent="renamePreset">
      <label for="rhythm-preset-name" class="text-daw-text text-xs">Name</label>
      <input
        id="rhythm-preset-name"
        v-model="nameDraft"
        type="text"
        maxlength="60"
        class="bg-daw-panel border-daw-border text-daw-text focus-visible:outline-daw-pulse rounded-control h-7 border px-2 text-xs focus-visible:outline"
        :aria-invalid="!!nameError"
        :aria-describedby="nameError ? 'rhythm-rename-error' : undefined"
      />
      <p v-if="nameError" id="rhythm-rename-error" class="text-micro text-daw-danger" role="alert">{{ nameError }}</p>
    </form>
    <template #footer>
      <DawButton appearance="surface" size="md" @click="isRenameOpen = false">Cancel</DawButton>
      <DawButton type="submit" form="rename-rhythm-form" appearance="primary" variant="signal" size="md">
        Save name
      </DawButton>
    </template>
  </DawModal>

  <DawModal v-model="isDeleteOpen" title="Delete saved rhythm" max-width="max-w-sm">
    <p class="text-daw-text-muted text-xs">Delete “{{ pendingDeletePreset?.name }}” from your saved rhythms?</p>
    <template #footer>
      <DawButton appearance="surface" size="md" @click="pendingDeleteId = null">Cancel</DawButton>
      <DawButton appearance="primary" variant="danger" size="md" @click="deletePreset"> Delete rhythm </DawButton>
    </template>
  </DawModal>

  <DawModal v-model="isSwitchOpen" title="Open another rhythm" max-width="max-w-sm">
    <p class="text-daw-text-muted text-xs">
      {{
        activePreset
          ? `Changes to “${activePreset.name}” are not saved.`
          : 'The current studio pattern is not saved as a rhythm.'
      }}
      Opening another rhythm will replace it.
    </p>
    <template #footer>
      <DawButton appearance="surface" size="md" @click="pendingOpenId = null">Keep editing</DawButton>
      <DawButton appearance="primary" variant="signal" size="md" @click="confirmOpen"> Open rhythm </DawButton>
    </template>
  </DawModal>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { Pencil, Trash2 } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import DawModal from '@/components/common/DawModal.vue'
  import { useMelodyStore } from '@/stores/melody.store'
  import { useRhythmStore } from '@/stores/rhythm.store'
  import { useUiStore } from '@/stores/ui.store'

  const rhythmStore = useRhythmStore()
  const melodyStore = useMelodyStore()
  const uiStore = useUiStore()
  const renameId = ref<string | null>(null)
  const pendingDeleteId = ref<string | null>(null)
  const pendingOpenId = ref<string | null>(null)
  const nameDraft = ref('')
  const nameError = ref('')
  const isRenameOpen = computed({
    get: () => renameId.value !== null,
    set: (open: boolean) => {
      if (!open) renameId.value = null
    }
  })
  const isDeleteOpen = computed({
    get: () => pendingDeleteId.value !== null,
    set: (open: boolean) => {
      if (!open) pendingDeleteId.value = null
    }
  })
  const pendingDeletePreset = computed(() => rhythmStore.savedPresets.find((item) => item.id === pendingDeleteId.value))
  const activePreset = computed(() =>
    rhythmStore.savedPresets.find((item) => item.id === rhythmStore.activeSavedPresetId)
  )
  const hasUnsavedChanges = computed(() =>
    activePreset.value
      ? JSON.stringify(activePreset.value.pattern) !== JSON.stringify(rhythmStore.pattern)
      : rhythmStore.pattern.events.length > 0
  )
  const isSwitchOpen = computed({
    get: () => pendingOpenId.value !== null,
    set: (open: boolean) => {
      if (!open) pendingOpenId.value = null
    }
  })

  function openPreset(id: string): void {
    if (id !== rhythmStore.activeSavedPresetId && hasUnsavedChanges.value) {
      pendingOpenId.value = id
      return
    }
    loadPreset(id)
  }
  function loadPreset(id: string): void {
    if (id !== rhythmStore.activeSavedPresetId && !rhythmStore.loadSavedPreset(id)) return
    melodyStore.setRhythmMode('custom')
    uiStore.setRhythmStudioOpen(true)
  }
  function confirmOpen(): void {
    if (pendingOpenId.value) loadPreset(pendingOpenId.value)
    pendingOpenId.value = null
  }
  function beginRename(id: string): void {
    const preset = rhythmStore.savedPresets.find((item) => item.id === id)
    if (!preset) return
    nameDraft.value = preset.name
    nameError.value = ''
    renameId.value = id
  }
  function renamePreset(): void {
    if (!renameId.value) return
    if (!nameDraft.value.trim()) {
      nameError.value = 'Enter a name for this rhythm.'
      return
    }
    if (rhythmStore.renameSavedPreset(renameId.value, nameDraft.value)) renameId.value = null
    else nameError.value = rhythmStore.error ?? 'Could not rename this rhythm.'
  }
  function deletePreset(): void {
    if (pendingDeleteId.value && rhythmStore.deleteSavedPreset(pendingDeleteId.value)) pendingDeleteId.value = null
  }
</script>
