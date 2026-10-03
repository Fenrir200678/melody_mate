<template>
  <div class="btn-generate-group flex shrink-0 items-center" role="group" aria-label="Generate melody">
    <DawButton
      size="md"
      appearance="primary"
      variant="signal"
      class="rounded-full! px-2 sm:px-2.5 xl:px-3"
      :disabled="
        melodyStore.isGenerating || (melodyStore.generatorParams.rhythmMode === 'custom' && !rhythmStore.canGenerate)
      "
      :title="generateButtonTitle"
      @click="void melodyStore.generate()"
    >
      <Loader2 v-if="melodyStore.isGenerating" class="h-4 w-4 shrink-0 animate-spin" />
      <Wand2 v-else class="h-4 w-4 shrink-0" />
      <span class="hidden xl:inline">{{ melodyStore.isGenerating ? 'Generating…' : 'GENERATE' }}</span>
    </DawButton>
    <div class="btn-generate-divider" aria-hidden="true" />
    <DawButton
      size="sm"
      appearance="ghost"
      variant="signal"
      class="rounded-full!"
      :icon="Dice5"
      :disabled="melodyStore.isGenerating"
      disabled-reason="Wait for melody generation to finish"
      :title="`Randomize key, scale, chords, rhythm, motif, contour and feel, then generate in ${workRangeLabel}`"
      aria-label="Surprise me"
      @click="void surpriseMe()"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Dice5, Loader2, Wand2 } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import { useSurpriseGeneration } from '@/composables/useSurpriseGeneration'
  import { useMelodyStore } from '@/stores/melody.store'
  import { useProjectStore } from '@/stores/project.store'
  import { useRhythmStore } from '@/stores/rhythm.store'
  import { formatWorkRangeLabel } from '@/utils/work-range-label'

  const melodyStore = useMelodyStore()
  const projectStore = useProjectStore()
  const rhythmStore = useRhythmStore()
  const { surpriseMe } = useSurpriseGeneration()
  const workRangeLabel = computed(() => formatWorkRangeLabel(projectStore.workRange))
  const generateButtonTitle = computed(() =>
    melodyStore.generatorParams.rhythmMode === 'custom' && !rhythmStore.canGenerate
      ? 'Add an onset in Rhythm Studio before generating'
      : `Generate melody in ${workRangeLabel.value} (G)`
  )
</script>
