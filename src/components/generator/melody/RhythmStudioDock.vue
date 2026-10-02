<template>
  <section
    id="rhythm-studio-dock"
    ref="dockRef"
    class="rhythm-studio border-daw-border bg-daw-panel flex min-h-0 shrink-0 flex-col overflow-hidden border-t"
    :style="{ height: `${effectiveHeight}px` }"
    aria-labelledby="rhythm-studio-title"
    @keydown="handleKeydown"
    @focusin="uiStore.setActiveHistoryContext('rhythm')"
    @pointerdown="uiStore.setActiveHistoryContext('rhythm')"
  >
    <!-- Top Resize Handle -->
    <DawResizeHandle
      :model-value="effectiveHeight"
      orientation="horizontal"
      side="bottom"
      :min="minDockHeight"
      :max="maxDockHeight"
      :default-value="RHYTHM_STUDIO_DEFAULT_HEIGHT"
      label="Resize Rhythm Studio"
      @update:model-value="uiStore.setRhythmStudioHeight"
    />

    <!-- Header bar with title, chip, undo/redo, preview, generate, close -->
    <RhythmStudioHeader />

    <!-- Toolbar with note length, bars, actions, duplicate, copy, clear -->
    <RhythmStudioToolbar
      v-model:selected-length="selectedLength"
      @open-save-dialog="openSaveDialog"
      @save-changes="saveChanges"
    />

    <!-- Status feedback banner and keyboard hints -->
    <RhythmStudioStatus :save-notice="saveNotice" />

    <!-- 16th Pattern Grid with Bars, Cells, Events, and Accents -->
    <RhythmPatternGrid :selected-length="selectedLength" />

    <!-- Footer info -->
    <footer
      class="rhythm-studio__footer border-daw-border flex shrink-0 items-center justify-between border-t px-3 py-1"
    >
      <span class="text-daw-text-muted text-micro">
        16th grid · swing and timing looseness remain active during playback
      </span>
      <span class="text-daw-text-muted text-micro font-mono">
        {{ pattern.events.length }} / {{ pattern.bars * 16 }} steps used
      </span>
    </footer>
  </section>

  <!-- Save Custom Rhythm Modal -->
  <RhythmSaveModal v-model="isSaveDialogOpen" @saved="handlePresetSaved" />
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
  import { DEFAULT_UI_DIMENSIONS } from '@/config/ui-defaults'
  import { useStudioDockSize } from '@/composables/useStudioDockSize'
  import DawResizeHandle from '@/components/common/DawResizeHandle.vue'
  import { useMelodyStore } from '@/stores/melody.store'
  import { useRhythmStore } from '@/stores/rhythm.store'
  import { RHYTHM_STUDIO_DEFAULT_HEIGHT, useUiStore } from '@/stores/ui.store'
  import RhythmPatternGrid from './rhythm-studio/RhythmPatternGrid.vue'
  import RhythmSaveModal from './rhythm-studio/RhythmSaveModal.vue'
  import RhythmStudioHeader from './rhythm-studio/RhythmStudioHeader.vue'
  import RhythmStudioStatus from './rhythm-studio/RhythmStudioStatus.vue'
  import RhythmStudioToolbar from './rhythm-studio/RhythmStudioToolbar.vue'

  const store = useRhythmStore()
  const uiStore = useUiStore()
  const melodyStore = useMelodyStore()

  const dockRef = useTemplateRef<HTMLElement>('dockRef')
  const { effectiveHeight, minDockHeight, maxDockHeight } = useStudioDockSize(
    dockRef,
    () => uiStore.rhythmStudioHeight,
    DEFAULT_UI_DIMENSIONS.rhythmStudio
  )

  onBeforeUnmount(() => {
    store.stopPreview()
  })

  const pattern = computed(() => store.pattern)
  const selectedLength = ref(4)
  const isSaveDialogOpen = ref(false)
  const saveNotice = ref('')

  watch(pattern, () => {
    saveNotice.value = ''
  })

  function openSaveDialog(): void {
    isSaveDialogOpen.value = true
  }

  function handlePresetSaved(presetName: string): void {
    saveNotice.value = `Saved ${presetName}`
  }

  function saveChanges(): void {
    const activeSavedPreset = store.savedPresets.find((item) => item.id === store.activeSavedPresetId)
    if (!activeSavedPreset) return
    const name = activeSavedPreset.name
    if (store.updateSavedPreset(activeSavedPreset.id)) {
      melodyStore.setRhythmMode('custom')
      saveNotice.value = `Saved changes to ${name}`
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) store.redo()
      else store.undo()
    }
  }
</script>
