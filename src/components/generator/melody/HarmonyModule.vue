<template>
  <DawModule v-model="isOpen" data-module-key="harmony" title="Harmony" role-dot="chord" badge-color="chord">
    <template #badge>
      <span v-if="hasNoChords" class="text-micro font-mono text-amber-400/90"> No chords </span>
      <span v-else class="text-daw-chord text-micro font-mono">
        {{ adherencePercent }}% · {{ cadenceStatusLabel }}
      </span>
    </template>

    <!-- Chord Tone Adherence Control -->
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <span class="text-daw-text text-2xs font-medium">Chord Tone Adherence</span>
        <span class="text-daw-chord text-micro font-mono font-bold">{{ adherencePercent }}%</span>
      </div>

      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <DawKnob
            :model-value="adherencePercent"
            :min="0"
            :max="100"
            :step="5"
            unit="%"
            variant="chord"
            size="sm"
            title="Chord tone adherence: percentage of melody notes locked to underlying chord tones on downbeats"
            @update:model-value="setAdherence"
          />

          <div class="flex flex-col gap-0.5 text-left">
            <span class="text-daw-text text-2xs font-mono font-medium">{{ adherenceImpactLabel }}</span>
            <span class="text-daw-text-muted text-micro">Targets downbeats 1 &amp; 3</span>
          </div>
        </div>

        <div
          v-if="hasNoChords"
          class="rounded-chip text-micro border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-amber-400"
        >
          No chords in timeline
        </div>
        <span v-else class="text-daw-chord text-micro font-mono">
          {{ harmonyStore.chords.length }} {{ harmonyStore.chords.length === 1 ? 'chord' : 'chords' }}
        </span>
      </div>
    </div>

    <!-- Cadence & Tonic Anchor Toggles -->
    <div class="border-daw-border flex flex-col gap-1.5 border-t pt-2">
      <div class="flex items-center justify-between">
        <span class="text-daw-text-muted text-micro font-medium">Cadence &amp; tonic anchor</span>
        <span class="text-daw-chord text-micro font-mono">{{ cadenceStatusLabel }}</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <DawToggle
          v-model="startWithRoot"
          label="Start on Root"
          short-label="Start Root"
          appearance="button"
          size="sm"
          variant="chord"
          title="Start on Root: ensures the melody begins on the key root note"
        />
        <DawToggle
          v-model="endWithRoot"
          label="Resolve to Root"
          short-label="To Root"
          appearance="button"
          size="sm"
          variant="chord"
          title="Resolve to Root: guides the final phrase to resolve cleanly onto the root note"
        />
      </div>
    </div>

    <!-- Quick Modifier: Pentatonic Mode -->
    <div class="border-daw-border flex flex-col gap-1.5 border-t pt-2">
      <DawToggle
        v-model="pentatonicMode"
        label="Pentatonic Hook Constraint"
        short-label="Pentatonic Hook"
        appearance="button"
        size="sm"
        variant="chord"
        title="Pentatonic Hook: restricts melody to the 5-note pentatonic scale for catchy hooks"
      />
    </div>
  </DawModule>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import DawKnob from '@/components/common/DawKnob.vue'
  import DawModule from '@/components/common/DawModule.vue'
  import DawToggle from '@/components/common/DawToggle.vue'
  import { useModuleOpenState } from '@/composables/useModuleOpenState'
  import { useHarmonyStore } from '@/stores/harmony.store'
  import { useMelodyStore } from '@/stores/melody.store'

  const melodyStore = useMelodyStore()
  const harmonyStore = useHarmonyStore()
  const isOpen = useModuleOpenState('harmony')

  const hasNoChords = computed(() => harmonyStore.chords.length === 0)

  const adherencePercent = computed(() =>
    Math.round((melodyStore.generatorParams.chordAdherence ?? harmonyStore.adherence ?? 0.75) * 100)
  )

  const adherenceImpactLabel = computed(() => {
    const val = adherencePercent.value
    if (val >= 85) return 'Rigid Arpeggiation'
    if (val >= 65) return 'Balanced Phrasing'
    return 'Modal / Tension-Rich'
  })

  function setAdherence(percent: number): void {
    const factor = percent / 100
    melodyStore.setGeneratorParams({ chordAdherence: factor })
    harmonyStore.setAdherence(factor)
  }

  const startWithRoot = computed({
    get: () => melodyStore.generatorParams.startWithRoot,
    set: (val: boolean) => melodyStore.setGeneratorParams({ startWithRoot: val })
  })

  const endWithRoot = computed({
    get: () => melodyStore.generatorParams.endWithRoot,
    set: (val: boolean) => melodyStore.setGeneratorParams({ endWithRoot: val })
  })

  const pentatonicMode = computed({
    get: () => melodyStore.generatorParams.pentatonicMode,
    set: (val: boolean) => melodyStore.setGeneratorParams({ pentatonicMode: val })
  })

  const cadenceStatusLabel = computed(() => {
    const { startWithRoot, endWithRoot } = melodyStore.generatorParams
    if (startWithRoot && endWithRoot) return 'Start & End'
    if (startWithRoot) return 'Start Only'
    if (endWithRoot) return 'Resolve Only'
    return 'Off'
  })
</script>
