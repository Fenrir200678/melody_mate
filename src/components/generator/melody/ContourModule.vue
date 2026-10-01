<template>
  <DawModule
    v-model="isOpen"
    data-module-key="contour"
    title="Contour"
    role-dot="signal"
    badge-color="signal"
    :badge="contourSummaryLabel"
  >
    <!-- Melodic Contour Section -->
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <label class="text-daw-text-muted text-2xs font-medium">Melodic Contour</label>
        <span class="text-daw-signal text-micro font-mono capitalize">
          {{ melodyStore.generatorParams.contour }}
        </span>
      </div>
      <DawSegmented
        :model-value="melodyStore.generatorParams.contour"
        :options="contourOptions"
        size="sm"
        grow
        aria-label="Melodic contour"
        @update:model-value="setContour"
      />
      <div v-if="melodyStore.generatorParams.contour !== 'free'" class="flex flex-col gap-1">
        <div class="flex items-center justify-between">
          <label class="text-daw-text-muted text-2xs font-medium">Contour strength</label>
          <span class="text-daw-signal text-micro font-mono tabular-nums">
            {{ Math.round(melodyStore.generatorParams.contourStrength * 100) }} %
          </span>
        </div>
        <DawFader
          :model-value="melodyStore.generatorParams.contourStrength"
          orientation="horizontal"
          :min="0"
          :max="1"
          :step="0.05"
          :show-db="false"
          aria-label="Contour strength"
          title="Contour strength: how strictly notes follow the target contour shape"
          @update:model-value="(value) => melodyStore.setGeneratorParams({ contourStrength: value })"
        />
      </div>
    </div>

    <!-- Step Memory / Markov Complexity Section -->
    <div class="border-daw-border flex flex-col gap-1.5 border-t pt-2">
      <div class="flex items-center justify-between">
        <label class="text-daw-text-muted text-2xs font-medium">Step Memory</label>
        <span class="text-daw-text-muted text-micro font-mono">
          Order {{ melodyStore.generatorParams.markovOrder }}
        </span>
      </div>
      <DawSegmented
        :model-value="melodyStore.generatorParams.markovOrder"
        :options="markovOptions"
        size="sm"
        grow
        aria-label="Markov step memory order"
        @update:model-value="setMarkovOrder"
      />
    </div>
  </DawModule>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import DawFader from '@/components/common/DawFader.vue'
  import DawModule from '@/components/common/DawModule.vue'
  import DawSegmented, { type SegmentOption } from '@/components/common/DawSegmented.vue'
  import { useModuleOpenState } from '@/composables/useModuleOpenState'
  import type { Contour } from '@/core/schemas/generator.schema'
  import { useMelodyStore } from '@/stores/melody.store'

  const melodyStore = useMelodyStore()
  const isOpen = useModuleOpenState('contour')

  const contourLabels: Record<Contour, string> = {
    free: 'Free',
    ascending: 'Asc',
    descending: 'Desc',
    arch: 'Arch',
    valley: 'Valley'
  }

  const contourSummaryLabel = computed(() => {
    const contour = contourLabels[melodyStore.generatorParams.contour] ?? 'Free'
    return `${contour} · O${melodyStore.generatorParams.markovOrder}`
  })

  const contourOptions: SegmentOption<Contour>[] = [
    { label: 'Free', value: 'free', title: 'Free: natural melodic movement without enforced direction' },
    { label: 'Asc', value: 'ascending', title: 'Ascending: melody climbs upward across the phrase' },
    { label: 'Desc', value: 'descending', title: 'Descending: melody cascades downward across the phrase' },
    { label: 'Arch', value: 'arch', title: 'Arch: melody rises to a peak and resolves downward' },
    { label: 'Valley', value: 'valley', title: 'Valley: melody dips to a low point and resolves upward' }
  ]

  const markovOptions: SegmentOption<number>[] = [
    { label: '1st', value: 1, title: '1st Order: Unigram transitions (freer, more exploratory leaps)' },
    { label: '2nd', value: 2, title: '2nd Order: Bigram memory (balanced, natural melodic flow)' },
    { label: '3rd', value: 3, title: '3rd Order: Trigram memory (structured scalar sequences)' },
    { label: '4th', value: 4, title: '4th Order: 4-gram memory (strict adherence to scale intervals)' }
  ]

  function setContour(contour: Contour): void {
    melodyStore.setGeneratorParams({ contour })
  }

  function setMarkovOrder(markovOrder: number): void {
    melodyStore.setGeneratorParams({ markovOrder })
  }
</script>
