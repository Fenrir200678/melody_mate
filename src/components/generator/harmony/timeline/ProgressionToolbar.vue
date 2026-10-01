<template>
  <div class="border-daw-border bg-daw-panel flex w-full shrink-0 items-center justify-between border-b px-3 py-1.5">
    <div class="flex items-center gap-2">
      <DawButton
        size="xs"
        appearance="surface"
        variant="signal"
        :active="audioStore.isPreviewingProgression"
        :icon="audioStore.isPreviewingProgression ? Square : Play"
        :title="audioStore.isPreviewingProgression ? 'Stop Progression Preview' : 'Audition chord progression'"
        @click="toggleProgressionPreview"
      >
        {{ audioStore.isPreviewingProgression ? 'Stop Preview' : 'Play Progression' }}
      </DawButton>

      <DawButton
        size="xs"
        appearance="surface"
        :icon="Wand2"
        :disabled="harmonyStore.chords.length <= 1"
        title="Smooth Voice Leading (Auto-Inversions)"
        @click="harmonyStore.applySmoothVoiceLeading()"
      >
        Smooth
      </DawButton>

      <DawButton
        size="xs"
        appearance="surface"
        variant="chord"
        :active="harmonyStore.autoSmooth"
        :icon="Sparkles"
        :title="harmonyStore.autoSmooth ? 'Auto Smooth is active' : 'Enable Auto Smooth'"
        @click="harmonyStore.toggleAutoSmooth()"
      >
        Auto Smooth
      </DawButton>

      <DawButton
        size="xs"
        appearance="surface"
        :icon="Copy"
        :disabled="isDuplicateDisabled"
        :disabled-reason="duplicateDisabledReason"
        title="Duplicate progression to double length"
        @click="duplicateProgression"
      >
        Duplicate
      </DawButton>

      <DawButton
        size="xs"
        appearance="surface"
        variant="chord"
        :icon="FoldHorizontal"
        :disabled="gapCount === 0"
        disabled-reason="No gaps to close"
        title="Align all chords seamlessly from bar zero"
        @click="harmonyStore.closeProgressionGaps()"
      >
        Close Gaps <span class="font-mono tabular-nums">({{ gapCount }})</span>
      </DawButton>

      <div class="bg-daw-border h-3 w-px" />

      <span class="text-daw-text-muted text-micro font-mono">
        {{ harmonyStore.chords.length }} Chords · {{ totalBars }} Bars
      </span>
    </div>

    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1">
        <span class="text-daw-text-muted text-micro font-medium">Zoom:</span>
        <DawStepper
          :decrement-disabled="!canZoomOut"
          :increment-disabled="!canZoomIn"
          decrement-title="Zoom out timeline"
          increment-title="Zoom in timeline"
          @decrement="emit('zoomOut')"
          @increment="emit('zoomIn')"
        >
          <template #value>
            <span
              class="text-daw-text-muted hover:text-daw-text text-micro w-10 cursor-pointer text-center font-mono"
              title="Double-click to reset zoom"
              @dblclick="emit('resetZoom')"
            >
              {{ zoomPercentage }}%
            </span>
          </template>
        </DawStepper>
      </div>

      <DawButton
        v-if="harmonyStore.chords.length > 0"
        size="xs"
        appearance="ghost"
        variant="danger"
        :icon="Trash2"
        title="Clear entire progression"
        @click="harmonyStore.clearChords()"
      >
        Clear All
      </DawButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { PROJECT_BAR_BOUNDS } from '@/config/defaults'
  import { findProgressionGaps } from '@/core/theory/progression-gaps'
  import { Copy, FoldHorizontal, Play, Sparkles, Square, Trash2, Wand2 } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawStepper from '@/components/common/DawStepper.vue'
  import {
    calculateProgressionBars,
    duplicateProgression as cloneProgression,
    progressionEndBar
  } from '@/composables/harmony/timelineOps'
  import { useAudioStore } from '@/stores/audio.store'
  import { useHarmonyStore } from '@/stores/harmony.store'
  import { useProjectStore } from '@/stores/project.store'

  defineProps<{
    totalBars: number
    zoomPercentage: number
    canZoomIn: boolean
    canZoomOut: boolean
  }>()

  const emit = defineEmits<{
    zoomIn: []
    zoomOut: []
    resetZoom: []
  }>()

  const harmonyStore = useHarmonyStore()
  const gapCount = computed(() => findProgressionGaps(harmonyStore.chords).length)
  const audioStore = useAudioStore()
  const projectStore = useProjectStore()

  const endBar = computed(() => progressionEndBar(harmonyStore.chords))
  const isDuplicateDisabled = computed(() => {
    if (harmonyStore.chords.length === 0) return true
    return endBar.value * 2 > PROJECT_BAR_BOUNDS.max
  })
  const duplicateDisabledReason = computed(() => {
    if (harmonyStore.chords.length === 0) return 'No chords to duplicate'
    if (endBar.value * 2 > PROJECT_BAR_BOUNDS.max) {
      return `Duplicating would exceed maximum project length (${PROJECT_BAR_BOUNDS.max} bars)`
    }
    return undefined
  })

  function toggleProgressionPreview(): void {
    if (audioStore.isPreviewingProgression) {
      audioStore.stopProgressionPreview()
    } else {
      audioStore.previewProgression(harmonyStore.chords)
    }
  }

  function duplicateProgression(): void {
    if (isDuplicateDisabled.value) return
    const next = cloneProgression(harmonyStore.chords)
    if (next.length === 0) return

    harmonyStore.setChords(next)
    const bars = calculateProgressionBars(projectStore.bars, next)
    if (bars > projectStore.bars) {
      projectStore.setBars(bars)
    }
  }
</script>
