<template>
  <div class="flex min-w-0 flex-col gap-3 overflow-y-auto px-3 py-2.5">
    <!-- Pattern Row -->
    <div class="flex min-w-0 flex-col gap-1">
      <span class="text-daw-text-muted text-2xs font-medium">Pattern</span>
      <DawSegmented
        v-model="pattern"
        :options="arpPatternOptions"
        size="sm"
        grow
        wrap
        aria-label="Arpeggio pattern"
        :title="arpControlTooltips.pattern"
      />
    </div>

    <!-- Rate & Pitch Source Row -->
    <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3">
      <div class="flex min-w-0 flex-col gap-1">
        <span class="text-daw-text-muted text-2xs font-medium">Rate</span>
        <DawSegmented
          v-model="rate"
          :options="arpRateOptions"
          size="sm"
          grow
          wrap
          aria-label="Arpeggio rate"
          :title="arpControlTooltips.rate"
        />
      </div>
      <div class="flex min-w-0 flex-col gap-1">
        <span class="text-daw-text-muted text-2xs font-medium">Pitch source</span>
        <DawSegmented
          v-model="pitchSource"
          :options="arpPitchSourceOptions"
          size="sm"
          grow
          wrap
          aria-label="Arp pitch source"
          :title="arpControlTooltips.pitchSource"
        />
      </div>
    </div>

    <div class="border-daw-border flex flex-wrap items-center gap-4 border-t pt-2.5">
      <!-- Group A: Register & Tuning -->
      <div class="flex min-w-0 flex-wrap items-center gap-4">
        <DawKnob
          v-model="baseOctave"
          label="Base octave"
          :min="1"
          :max="6"
          :step="1"
          :default-value="DEFAULT_GENERATOR_PARAMS.arpBaseOctave"
          :format-value="formatNoteC"
          size="sm"
          :disabled="usesVoicing"
          :title="registerKnobTitle"
        />
        <DawKnob
          v-model="octaveRange"
          label="Octave range"
          :min="1"
          :max="4"
          :step="1"
          :default-value="DEFAULT_GENERATOR_PARAMS.arpOctaveRange"
          :format-value="formatOctaves"
          size="sm"
          :disabled="usesVoicing"
          :title="registerKnobTitle"
        />
        <div class="flex min-w-0 flex-col gap-1" :title="octaveModeReason || arpControlTooltips.octaveMode">
          <span class="text-daw-text-muted text-2xs font-medium">Octave mode</span>
          <DawSegmented
            v-model="octaveMode"
            :options="arpOctaveModeOptions"
            size="xs"
            aria-label="Arpeggio octave mode"
            :disabled="usesVoicing || octaveRange === 1"
            :disabled-reason="octaveModeReason"
          />
        </div>
        <div class="flex min-w-0 flex-col gap-1" :title="inversionCyclingReason || arpControlTooltips.inversionCycling">
          <span class="text-daw-text-muted text-2xs font-medium">Inversion cycling</span>
          <DawToggle
            v-model="effectiveInversionCycling"
            appearance="switch"
            variant="signal"
            size="sm"
            label="Inv Cycle"
            :disabled="!canCycleInversions"
            :disabled-reason="inversionCyclingReason"
            :title="arpControlTooltips.inversionCycling"
          />
        </div>
        <div class="flex min-w-0 flex-col gap-1">
          <span class="text-daw-text-muted text-2xs font-medium">Register</span>
          <div
            class="border-daw-border bg-daw-surface rounded-control flex h-6 items-center gap-1.5 border px-2 font-mono"
            :title="registerTitle"
          >
            <span class="text-daw-signal text-xs font-semibold tabular-nums">{{ registerLabel }}</span>
            <span class="text-daw-text-muted text-micro">{{ registerSuffix }}</span>
          </div>
        </div>
        <div class="flex min-w-0 flex-col gap-1">
          <label for="arp-seed" class="text-daw-text-muted text-2xs font-medium">Base seed</label>
          <div class="flex items-center gap-1">
            <input
              id="arp-seed"
              name="arp-seed"
              type="number"
              inputmode="numeric"
              autocomplete="off"
              min="0"
              max="4294967295"
              step="1"
              :value="melodyStore.generatorParams.arpSeed"
              class="border-daw-border bg-daw-bg text-daw-text rounded-control focus-visible:border-daw-signal h-6 w-28 border px-2 font-mono text-xs tabular-nums focus-visible:outline-none"
              :title="arpControlTooltips.seed"
              @change="updateSeed"
            />
            <DawButton
              size="sm"
              appearance="surface"
              variant="signal"
              :active="melodyStore.generatorParams.arpSeedLocked"
              class="text-2xs font-mono"
              :aria-pressed="melodyStore.generatorParams.arpSeedLocked"
              :aria-label="
                melodyStore.generatorParams.arpSeedLocked ? 'Unlock seed and use Auto' : 'Lock displayed seed'
              "
              :title="
                melodyStore.generatorParams.arpSeedLocked ? arpControlTooltips.seedLocked : arpControlTooltips.seedAuto
              "
              @click="toggleSeedLock"
            >
              {{ melodyStore.generatorParams.arpSeedLocked ? 'Locked' : 'Auto' }}
            </DawButton>
          </div>
        </div>
      </div>

      <!-- Hairline divider -->
      <div class="bg-daw-border h-8 w-px shrink-0 self-center" aria-hidden="true" />

      <!-- Group B: Articulation & Groove -->
      <div class="flex items-center gap-4">
        <DawKnob
          v-for="k in ARP_ARTICULATION_KNOBS"
          :key="k.key"
          :model-value="melodyStore.generatorParams[k.key]"
          :label="k.label"
          :min="k.min"
          :max="k.max"
          :step="5"
          :default-value="k.defaultVal"
          :format-value="formatPercent"
          size="sm"
          :title="k.tooltip"
          @update:model-value="(val: number) => melodyStore.setGeneratorParams({ [k.key]: val })"
        />
      </div>
    </div>

    <ArpVariationControls />

    <!-- Standalone engine hint row -->
    <p
      class="text-daw-text-muted text-micro leading-normal"
      title="Arp Studio is a standalone arpeggiator guided by chords and rate. Lead melody parameters (motif form, contour, call & response) do not apply to arpeggios."
    >
      <span class="text-daw-text font-medium">Standalone Engine:</span> Guided by chords & rate — independent of lead
      melody motifs & contour.
    </p>

    <!-- Voicing fallback notice: the user must see when Chord Studio edits cannot be heard -->
    <p
      v-if="usesVoicing && !voicingSpan"
      class="text-daw-chord text-micro leading-normal"
      :title="arpControlTooltips.registerInactive"
    >
      <span class="font-medium">Pitch classes fallback:</span> No chord with a usable voicing overlaps the work range,
      so the arpeggio is rebuilt from synthetic pitch classes and ignores Chord Studio register edits.
    </p>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawKnob from '@/components/common/DawKnob.vue'
  import DawSegmented from '@/components/common/DawSegmented.vue'
  import DawToggle from '@/components/common/DawToggle.vue'
  import ArpVariationControls from './ArpVariationControls.vue'
  import { DEFAULT_GENERATOR_PARAMS } from '@/config/defaults'
  import { parseArpSeedInput } from '@/composables/arpSeed'
  import { useMelodyStore } from '@/stores/melody.store'
  import {
    ARP_ARTICULATION_KNOBS,
    arpControlTooltips,
    arpOctaveModeOptions,
    arpPatternOptions,
    arpPitchSourceOptions,
    arpRateOptions,
    formatNoteC,
    formatOctaves,
    formatPercent
  } from '@/utils/arp/arp-options'
  import { getArpVoicingSpan } from '@/core/generator/arp-voicing'
  import { canCycleArpInversions } from '@/core/generator/arp-inversion'
  import { useHarmonyStore } from '@/stores/harmony.store'
  import { useProjectStore } from '@/stores/project.store'

  const melodyStore = useMelodyStore()
  const harmonyStore = useHarmonyStore()
  const projectStore = useProjectStore()

  function bindParam<K extends keyof typeof melodyStore.generatorParams>(key: K) {
    return computed({
      get: () => melodyStore.generatorParams[key],
      set: (value) => melodyStore.setGeneratorParams({ [key]: value } as Partial<typeof melodyStore.generatorParams>)
    })
  }

  const pattern = bindParam('arpPattern')
  const rate = bindParam('arpRate')
  const baseOctave = bindParam('arpBaseOctave')
  const octaveRange = bindParam('arpOctaveRange')
  const octaveMode = bindParam('arpOctaveMode')
  const pitchSource = bindParam('arpPitchSource')
  const canCycleInversions = computed(() =>
    canCycleArpInversions(harmonyStore.useChords ? harmonyStore.chords : undefined)
  )
  const inversionCyclingReason = computed(() =>
    canCycleInversions.value ? undefined : 'Requires an enabled chord progression with a chord held for at least 2 bars'
  )
  const effectiveInversionCycling = computed({
    get: () => melodyStore.generatorParams.arpInversionCycling && canCycleInversions.value,
    set: (value: boolean) => melodyStore.setGeneratorParams({ arpInversionCycling: value })
  })

  const usesVoicing = computed(() => melodyStore.generatorParams.arpPitchSource === 'chord-voicing')
  const octaveModeReason = computed(() =>
    usesVoicing.value
      ? arpControlTooltips.octaveModeVoicing
      : octaveRange.value === 1
        ? arpControlTooltips.octaveModeSingle
        : undefined
  )

  const voicingSpan = computed(() =>
    usesVoicing.value
      ? getArpVoicingSpan(harmonyStore.useChords ? harmonyStore.chords : undefined, projectStore.workRange)
      : null
  )

  const registerLabel = computed(() => {
    const span = voicingSpan.value
    if (span) return `${span.lowPitch} – ${span.highPitch}`
    const p = melodyStore.generatorParams
    return `C${p.arpBaseOctave} – B${p.arpBaseOctave + p.arpOctaveRange - 1}`
  })

  const registerSuffix = computed(() => {
    if (!usesVoicing.value) {
      const count = melodyStore.generatorParams.arpOctaveRange
      return `(${count} ${count === 1 ? 'Oct' : 'Octs'})`
    }
    return voicingSpan.value ? '(voicing)' : '(no chord)'
  })

  const registerTitle = computed(() => {
    if (!usesVoicing.value) return arpControlTooltips.register
    return voicingSpan.value ? arpControlTooltips.registerVoicing : arpControlTooltips.registerInactive
  })

  const registerKnobTitle = computed(() => {
    if (!usesVoicing.value) return arpControlTooltips.baseOctave
    return voicingSpan.value ? arpControlTooltips.registerVoicing : arpControlTooltips.registerInactive
  })

  function updateSeed(event: Event): void {
    const input = event.target as HTMLInputElement
    const value = parseArpSeedInput(input.value)
    const valid = value !== null && input.validity.valid
    if (valid) melodyStore.setGeneratorParams({ arpSeed: value, arpSeedLocked: true })
    input.value = String(valid ? value : melodyStore.generatorParams.arpSeed)
  }

  const toggleSeedLock = () => {
    melodyStore.setGeneratorParams({ arpSeedLocked: !melodyStore.generatorParams.arpSeedLocked })
  }
</script>
