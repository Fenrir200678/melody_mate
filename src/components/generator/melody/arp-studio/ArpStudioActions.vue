<template>
  <div class="flex shrink-0 items-center gap-2">
    <DawButton
      size="md"
      appearance="surface"
      variant="signal"
      :icon="locked ? RefreshCw : Shuffle"
      :disabled="melodyStore.arpCandidateState === 'loading'"
      :title="
        locked
          ? 'Rebuild the candidate with the locked seed (Shift+G)'
          : 'Roll a new seed and build a new candidate for the work range (Shift+G)'
      "
      @click="melodyStore.shuffleArp()"
    >
      {{ locked ? 'Refresh' : 'Shuffle' }}
    </DawButton>
    <DawButton
      size="md"
      appearance="primary"
      variant="signal"
      :icon="Sparkles"
      :disabled="!isReady || melodyStore.isGenerating"
      title="Generate arpeggio into melody track (G)"
      @click="melodyStore.applyArp()"
    >
      {{ melodyStore.isGenerating ? 'Generating…' : 'Generate' }}
    </DawButton>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { RefreshCw, Shuffle, Sparkles } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import { useMelodyStore } from '@/stores/melody.store'

  const melodyStore = useMelodyStore()
  const locked = computed(() => melodyStore.generatorParams.arpSeedLocked)
  const isReady = computed(() => melodyStore.arpCandidateState === 'ready')
</script>
