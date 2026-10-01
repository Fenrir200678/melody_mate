<template>
  <div class="flex flex-col gap-2">
    <!-- Visualizer Canvas / SVG -->
    <div class="bg-daw-surface/50 rounded-panel flex w-full flex-col items-center justify-center p-1.5">
      <EuclideanVisualizer />
    </div>

    <!-- Step Resolution / Subdivision Selector -->
    <div class="flex flex-col gap-1">
      <div class="flex items-center justify-between">
        <span class="text-daw-text-muted text-2xs font-medium">Subdivision (Step Value)</span>
        <span class="text-daw-pulse text-micro font-mono font-semibold">
          {{ activeSubdivisionLabel }}
        </span>
      </div>

      <DawSegmented
        :model-value="melodyStore.generatorParams.euclideanSubdivision"
        :options="subdivisionOptions"
        size="sm"
        variant="pulse"
        grow
        aria-label="Euclidean subdivision"
        @update:model-value="setEuclideanSubdivision"
      />
    </div>

    <!-- Rotary Knobs (Pulses, Steps, Rotation) with Dynamic Live Readouts -->
    <div class="grid grid-cols-3 items-start justify-items-center gap-2">
      <!-- Pulses Knob -->
      <div class="flex flex-col items-center gap-1">
        <DawKnob
          :model-value="pulses"
          :min="1"
          :max="steps"
          :step="1"
          label="Pulses"
          size="sm"
          title="Pulses: number of hits distributed as evenly as possible across steps"
          @update:model-value="setEuclideanPulses"
        />
        <div class="flex flex-col items-center leading-none">
          <span class="text-daw-pulse text-micro font-mono font-semibold">{{ pulseDensityPercent }}%</span>
          <span class="text-daw-text-muted text-micro max-w-17.5 truncate text-center font-mono">
            {{ pulseFeelLabel }}
          </span>
        </div>
      </div>

      <!-- Steps Knob -->
      <div class="flex flex-col items-center gap-1">
        <DawKnob
          :model-value="steps"
          :min="1"
          :max="32"
          :step="1"
          label="Steps"
          size="sm"
          title="Steps: total loop length in subdivision intervals"
          @update:model-value="setEuclideanSteps"
        />
        <div class="flex flex-col items-center leading-none">
          <span class="text-daw-pulse text-micro font-mono font-semibold">{{ cycleBarsShort }}</span>
          <span class="text-daw-text-muted text-micro max-w-17.5 truncate text-center font-mono">
            {{ meterAlignmentLabel }}
          </span>
        </div>
      </div>

      <!-- Rotation Knob -->
      <div class="flex flex-col items-center gap-1">
        <DawKnob
          :model-value="rotation"
          :min="0"
          :max="Math.max(0, steps - 1)"
          :step="1"
          label="Rotate"
          size="sm"
          title="Rotate: shifts pattern start position forward or backward"
          @update:model-value="setEuclideanRotation"
        />
        <div class="flex flex-col items-center leading-none">
          <span class="text-daw-pulse text-micro font-mono font-semibold">
            {{ rotation > 0 ? `+${rotation}` : '0' }}
          </span>
          <span class="text-daw-text-muted text-micro max-w-17.5 truncate text-center font-mono">
            {{ isDownbeatPulse ? 'On-Beat' : 'Off-Beat' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Pattern Cycle Summary Readout -->
    <div class="border-daw-border text-micro flex w-full items-center justify-between border-t pt-1.5 font-mono">
      <span class="text-daw-text-muted">Cycle Duration:</span>
      <div class="flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full" :class="isBarAligned ? 'bg-daw-pulse' : 'bg-amber-400'" />
        <span class="text-daw-text font-medium">
          {{ cycleDurationText }}
        </span>
      </div>
    </div>

    <DawButton
      block
      align="center"
      size="md"
      appearance="surface"
      variant="pulse"
      :disabled="Boolean(copyError)"
      :title="copyError ?? 'Copy this pulse grid into Rhythm Studio'"
      @click="copyToRhythmStudio"
    >
      Copy pulse grid to Rhythm Studio
    </DawButton>
    <p v-if="copyError" class="text-daw-text-muted text-micro">{{ copyError }}</p>
    <p v-else class="text-daw-text-muted text-micro">Random rests and note-length scaling are not copied.</p>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawKnob from '@/components/common/DawKnob.vue'
  import DawSegmented, { type SegmentOption } from '@/components/common/DawSegmented.vue'
  import EuclideanVisualizer from '@/components/generator/melody/EuclideanVisualizer.vue'
  import { generateEuclideanPattern } from '@/core/rhythm/euclidean'
  import { copyEuclidean } from '@/core/rhythm/custom-pattern'
  import { subdivisionToStepsPerBar, type Subdivision } from '@/core/schemas/project.schema'
  import { useMelodyStore } from '@/stores/melody.store'
  import { useRhythmStore } from '@/stores/rhythm.store'

  const melodyStore = useMelodyStore()
  const rhythmStore = useRhythmStore()

  const pulses = computed(() => melodyStore.generatorParams.euclideanPulses)
  const steps = computed(() => melodyStore.generatorParams.euclideanSteps)
  const rotation = computed(() => melodyStore.generatorParams.euclideanRotation)
  const subdivision = computed<Subdivision>(() => melodyStore.generatorParams.euclideanSubdivision || '16n')
  const copyError = computed(() => {
    const result = copyEuclidean(pulses.value, steps.value, rotation.value, subdivision.value)
    return result.ok ? null : result.error
  })

  function copyToRhythmStudio(): void {
    if (rhythmStore.copyCurrentEuclidean()) melodyStore.setRhythmMode('custom')
  }

  const pulseDensityPercent = computed(() => Math.round((pulses.value / steps.value) * 100))

  const pulseFeelLabel = computed(() => {
    const pct = pulseDensityPercent.value
    if (pct < 25) return 'Sparse'
    if (pct <= 50) return 'Groove'
    if (pct <= 75) return 'Driving'
    return 'Motoric'
  })

  const spb = computed(() => subdivisionToStepsPerBar(subdivision.value))
  const isBarAligned = computed(() => steps.value % spb.value === 0)
  const cycleBars = computed(() => steps.value / spb.value)

  const cycleBarsShort = computed(() => {
    if (cycleBars.value === 1) return '1.0 Bar'
    if (Number.isInteger(cycleBars.value)) return `${cycleBars.value} Bars`
    return `${cycleBars.value.toFixed(1)} Bar`
  })

  const meterAlignmentLabel = computed(() => (isBarAligned.value ? 'Metric' : 'Polymetric'))

  const isDownbeatPulse = computed(() => {
    const pat = generateEuclideanPattern(pulses.value, steps.value, rotation.value)
    return Boolean(pat[0])
  })

  const subdivisionOptions: SegmentOption<Subdivision>[] = [
    { label: '1/16', value: '16n', title: '1/16 note resolution (fast, detailed syncopation)' },
    { label: '1/8', value: '8n', title: '1/8 note resolution (standard driving groove)' },
    { label: '1/4', value: '4n', title: '1/4 note resolution (steady quarter pulses)' }
  ]

  const activeSubdivisionLabel = computed(() => {
    switch (subdivision.value) {
      case '4n':
        return 'Quarter (1/4)'
      case '8n':
        return 'Eighth (1/8)'
      case '16n':
      default:
        return 'Sixteenth (1/16)'
    }
  })

  const cycleDurationText = computed(() => {
    const bars = cycleBars.value
    if (bars === 1) {
      return '1.0 Bar'
    } else if (Number.isInteger(bars)) {
      return `${bars}.0 Bars`
    } else {
      return `${bars.toFixed(2)} Bars (${steps.value} steps)`
    }
  })

  function setEuclideanPulses(nextPulses: number): void {
    melodyStore.setGeneratorParams({ euclideanPulses: nextPulses })
  }

  function setEuclideanSteps(nextSteps: number): void {
    const updates: { euclideanSteps: number; euclideanPulses?: number; euclideanRotation?: number } = {
      euclideanSteps: nextSteps
    }
    if (melodyStore.generatorParams.euclideanPulses > nextSteps) {
      updates.euclideanPulses = nextSteps
    }
    if (melodyStore.generatorParams.euclideanRotation >= nextSteps) {
      updates.euclideanRotation = Math.max(0, nextSteps - 1)
    }
    melodyStore.setGeneratorParams(updates)
  }

  function setEuclideanRotation(rot: number): void {
    melodyStore.setGeneratorParams({ euclideanRotation: rot })
  }

  function setEuclideanSubdivision(sub: Subdivision): void {
    melodyStore.setGeneratorParams({ euclideanSubdivision: sub })
  }
</script>
