<template>
  <DawModule
    v-model="isOpen"
    data-module-key="motif"
    title="Motif"
    role-dot="signal"
    badge-color="signal"
    :badge="motifSummaryLabel"
  >
    <!-- Mode Switcher: Standard Patterns vs Call & Response Dialogue -->
    <DawSegmented
      v-model="motifMode"
      :options="motifModeOptions"
      size="sm"
      grow
      class="w-full"
      aria-label="Motif structure mode"
    />

    <!-- Pattern Mode: Multi-bar Form Selection & Drift -->
    <template v-if="motifMode === 'pattern'">
      <MotifPatternPicker :model-value="melodyStore.generatorParams.motif" @update:model-value="setMotif" />

      <div v-if="melodyStore.generatorParams.motif !== 'FREE'" class="flex flex-col gap-1" :title="motifVariationHint">
        <div class="flex items-center justify-between">
          <label class="text-daw-text-muted text-2xs font-medium">Motif variation</label>
          <span class="text-daw-signal text-micro font-mono tabular-nums">
            {{ Math.round(melodyStore.generatorParams.motifVariation * 100) }} %
          </span>
        </div>
        <DawFader
          :model-value="melodyStore.generatorParams.motifVariation"
          orientation="horizontal"
          :min="0"
          :max="1"
          :step="0.05"
          :show-db="false"
          aria-label="Motif variation"
          title="Motif variation: how far repeated sections drift from the opening theme"
          @update:model-value="(value) => melodyStore.setGeneratorParams({ motifVariation: value })"
        />
      </div>
    </template>

    <!-- Call & Response Mode: Dialogue Style & Answer Drift -->
    <template v-else>
      <div class="flex flex-col gap-2">
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <label class="text-daw-text-muted text-2xs font-medium">Answer style</label>
            <span class="text-daw-signal text-micro font-mono capitalize">
              {{ melodyStore.generatorParams.answerStyle }}
            </span>
          </div>
          <DawSegmented
            :model-value="melodyStore.generatorParams.answerStyle"
            :options="answerStyleOptions"
            size="sm"
            grow
            aria-label="Answer style"
            @update:model-value="setAnswerStyle"
          />
        </div>

        <div class="flex flex-col gap-1" title="Answer variation: deviation amount of the response phrase">
          <div class="flex items-center justify-between">
            <label class="text-daw-text-muted text-2xs font-medium">Answer variation</label>
            <span class="text-daw-signal text-micro font-mono tabular-nums">
              {{ Math.round(melodyStore.generatorParams.answerVariation * 100) }} %
            </span>
          </div>
          <DawFader
            :model-value="melodyStore.generatorParams.answerVariation"
            orientation="horizontal"
            :min="0"
            :max="1"
            :step="0.05"
            :show-db="false"
            aria-label="Answer variation"
            title="Answer variation: deviation amount of the response phrase"
            @update:model-value="(value) => melodyStore.setGeneratorParams({ answerVariation: value })"
          />
        </div>
      </div>
    </template>
  </DawModule>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import DawFader from '@/components/common/DawFader.vue'
  import DawModule from '@/components/common/DawModule.vue'
  import DawSegmented, { type SegmentOption } from '@/components/common/DawSegmented.vue'
  import { useModuleOpenState } from '@/composables/useModuleOpenState'
  import type { AnswerStyle, MotifPattern } from '@/core/schemas/generator.schema'
  import { useMelodyStore } from '@/stores/melody.store'
  import { motifVariationHint } from '@/utils/motif-options'
  import MotifPatternPicker from './MotifPatternPicker.vue'

  const melodyStore = useMelodyStore()
  const isOpen = useModuleOpenState('motif')

  type MotifMode = 'pattern' | 'call-and-response'

  const motifMode = computed<MotifMode>({
    get: () => (melodyStore.generatorParams.callAndResponse ? 'call-and-response' : 'pattern'),
    set: (val: MotifMode) => {
      melodyStore.setGeneratorParams({ callAndResponse: val === 'call-and-response' })
    }
  })

  const motifModeOptions: SegmentOption<MotifMode>[] = [
    {
      label: 'Pattern',
      value: 'pattern',
      title: 'Standard multi-bar phrase forms (ABAB, AABA, etc.)'
    },
    {
      label: 'Call & Response',
      value: 'call-and-response',
      title: 'Dialogue form between question phrase and answering phrase'
    }
  ]

  const answerStyleOptions: SegmentOption<AnswerStyle>[] = [
    {
      label: 'Echo',
      value: 'echo',
      title: 'Echo: response repeats the call phrase with subtle variations'
    },
    {
      label: 'Continue',
      value: 'continue',
      title: 'Continue: response develops and extends the call phrase'
    },
    {
      label: 'Contrast',
      value: 'contrast',
      title: 'Contrast: response introduces contrasting melodic contour and tension'
    }
  ]

  const motifSummaryLabel = computed(() => {
    if (melodyStore.generatorParams.callAndResponse) {
      return `C&R · ${melodyStore.generatorParams.answerStyle}`
    }
    if (melodyStore.generatorParams.motif === 'FREE') {
      return 'Free'
    }
    return `${melodyStore.generatorParams.motif} · ${Math.round(melodyStore.generatorParams.motifVariation * 100)}%`
  })

  function setMotif(motif: MotifPattern): void {
    melodyStore.setGeneratorParams({ motif })
  }

  function setAnswerStyle(answerStyle: AnswerStyle): void {
    melodyStore.setGeneratorParams({ answerStyle })
  }
</script>
