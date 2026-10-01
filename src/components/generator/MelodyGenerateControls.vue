<template>
  <div class="btn-generate-group flex shrink-0 items-center" role="group" aria-label="Generate melody">
    <DawButton
      size="lg"
      appearance="primary"
      variant="signal"
      class="rounded-full!"
      :disabled="
        melodyStore.isGenerating || (melodyStore.generatorParams.rhythmMode === 'custom' && !rhythmStore.canGenerate)
      "
      :title="generateButtonTitle"
      @click="void melodyStore.generate()"
    >
      <Loader2 v-if="melodyStore.isGenerating" class="h-4 w-4 shrink-0 animate-spin" />
      <Wand2 v-else class="h-4 w-4 shrink-0" />
      <span>{{ melodyStore.isGenerating ? 'Generating…' : 'GENERATE' }}</span>
    </DawButton>
    <div class="btn-generate-divider" aria-hidden="true" />
    <span class="text-daw-text-muted text-micro max-w-28 truncate px-1 font-mono" :title="`Target: ${workRangeLabel}`">
      Target: {{ workRangeLabel }}
    </span>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Loader2, Wand2 } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import { useMelodyStore } from '@/stores/melody.store'
  import { useProjectStore } from '@/stores/project.store'
  import { useRhythmStore } from '@/stores/rhythm.store'
  import { formatWorkRangeLabel } from '@/utils/work-range-label'

  const melodyStore = useMelodyStore()
  const projectStore = useProjectStore()
  const rhythmStore = useRhythmStore()
  const workRangeLabel = computed(() => formatWorkRangeLabel(projectStore.workRange))
  const generateButtonTitle = computed(() =>
    melodyStore.generatorParams.rhythmMode === 'custom' && !rhythmStore.canGenerate
      ? 'Add an onset in Rhythm Studio before generating'
      : `Generate melody in ${workRangeLabel.value} (G)`
  )
</script>
