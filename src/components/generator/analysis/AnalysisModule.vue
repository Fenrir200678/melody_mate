<template>
  <DawModule v-model="isOpen" title="Analysis" role-dot="signal">
    <p v-if="!analysis" class="text-micro text-daw-text-muted py-2">Generate or play to see analysis</p>
    <template v-else>
      <div class="flex items-center gap-2">
        <div class="min-w-0 flex-1">
          <span class="text-micro text-daw-text-muted">Contour</span>
          <ContourSparkline
            :notes="melody.notes"
            :total-steps="project.bars * STEPS_PER_BAR"
            :range-label="analysis.metrics.rangeLabel"
          />
        </div>
        <div class="flex shrink-0 flex-col items-end gap-1">
          <span class="text-micro text-daw-text-muted">Range</span>
          <span class="text-micro font-mono">{{ analysis.metrics.rangeLabel }}</span>
          <span class="text-micro text-daw-text-muted font-mono">{{ analysis.metrics.rangeSemitones }} st</span>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-micro text-daw-text-muted">Motion balance</span>
        <div class="bg-daw-surface rounded-chip flex h-1 overflow-hidden" aria-hidden="true">
          <span
            v-for="segment in motionSegments"
            :key="segment.label"
            :class="segment.color"
            class="bg-current"
            :style="{ width: `${segment.value * 100}%` }"
          />
        </div>
        <div class="text-micro flex justify-between gap-1">
          <span v-for="segment in motionSegments" :key="segment.label" :class="segment.color">
            {{ segment.label }} <span class="font-mono">{{ percent(segment.value) }}</span>
          </span>
        </div>
      </div>
      <dl class="text-micro grid grid-cols-[1fr_auto] items-baseline gap-x-2 gap-y-1">
        <dt class="text-daw-text-muted">Syncopation</dt>
        <dd class="text-daw-pulse text-right font-mono">{{ percent(analysis.metrics.syncopationRatio) }}</dd>
        <dt class="text-daw-text-muted">Chord tones</dt>
        <dd class="text-right font-mono">
          <template v-if="analysis.metrics.chordToneRatio !== null && chordDelta !== null">
            {{ percent(analysis.metrics.chordToneRatio) }}
            <span :class="chordDelta >= 0 ? 'text-daw-pulse' : 'text-daw-text-muted'" :title="chordTargetLabel">
              ({{ chordDelta > 0 ? '+' : '' }}{{ chordDelta }} pp)
            </span>
          </template>
          <span v-else class="text-daw-text-muted" title="No active chords for these notes">Not available</span>
        </dd>
        <dt
          class="text-daw-text-muted"
          title="Exact pitch, onset and duration pairs repeated across bars; motif variation can reduce this value"
        >
          Exact repetition
        </dt>
        <dd class="text-right font-mono">{{ analysis.metrics.repetitionScore.toFixed(2) }}</dd>
        <dt class="text-daw-text-muted">Predictability</dt>
        <dd class="text-right font-mono">{{ analysis.metrics.rhythmPredictability.toFixed(2) }}</dd>
      </dl>
      <TensionLane :values="analysis.metrics.tensionPerBar" :register-only="analysis.metrics.chordToneRatio === null" />
      <div class="border-daw-border flex items-center gap-2 border-t pt-2">
        <span
          class="text-micro text-daw-text-muted flex-1"
          :title="
            analysis.metrics.chordToneRatio === null
              ? 'Melody-only estimate; unavailable harmony metrics are excluded'
              : 'Estimate from melody and available harmony metrics'
          "
          >Catchiness</span
        >
        <span class="text-daw-signal font-mono text-sm tabular-nums">{{ analysis.score }}</span>
        <span class="rounded-chip text-micro bg-daw-signal/10 text-daw-signal px-2 py-1">
          {{ analysis.label }}
        </span>
      </div>
      <p v-if="selectedTake" class="text-micro text-daw-text-muted font-mono">
        Selected take: {{ selectedTake.score ?? '–' }} · current: {{ analysis.score }}
      </p>
    </template>
  </DawModule>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import DawModule from '@/components/common/DawModule.vue'
  import { useMelodyAnalysis } from '@/composables/useMelodyAnalysis'
  import { useModuleOpenState } from '@/composables/useModuleOpenState'
  import { STEPS_PER_BAR } from '@/core/schemas/project.schema'
  import { useMelodyStore } from '@/stores/melody.store'
  import { useProjectStore } from '@/stores/project.store'
  import { useTakesStore } from '@/stores/takes.store'
  import ContourSparkline from './ContourSparkline.vue'
  import TensionLane from './TensionLane.vue'

  const melody = useMelodyStore()
  const project = useProjectStore()
  const takes = useTakesStore()
  const isOpen = useModuleOpenState('analysis')
  const analysis = useMelodyAnalysis()
  const selectedTake = computed(() => takes.takes.find((take) => take.id === takes.selectedTakeId))
  const percent = (value: number): string => `${Math.round(value * 100)}%`
  const chordDelta = computed(() => {
    const ratio = analysis.value?.metrics.chordToneRatio
    return ratio === null || ratio === undefined
      ? null
      : Math.round((ratio - melody.generatorParams.chordAdherence) * 100)
  })
  const chordTargetLabel = computed(() => `Delta from target ${percent(melody.generatorParams.chordAdherence)}`)
  const motionSegments = computed(() => {
    const motion = analysis.value?.metrics.motionBalance
    return [
      { label: 'Steps', value: motion?.steps ?? 0, color: 'text-daw-signal' },
      { label: 'Leaps', value: motion?.leaps ?? 0, color: 'text-daw-chord' },
      { label: 'Repeats', value: motion?.repeats ?? 0, color: 'text-daw-text-muted' }
    ]
  })
</script>
