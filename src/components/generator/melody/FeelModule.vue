<template>
  <DawModule
    v-model="isOpen"
    data-module-key="feel"
    title="Feel"
    role-dot="signal"
    badge-color="signal"
    :badge="feelSummaryBadge"
  >
    <section>
      <h3 class="text-daw-text-muted text-micro mb-2 font-semibold">Note flow</h3>
      <div class="grid grid-cols-3 items-center justify-items-center gap-x-2">
        <DawKnob
          v-model="restProbability"
          :min="0"
          :max="100"
          :step="5"
          unit="%"
          label="Breath"
          :disabled="isCustom"
          size="sm"
          variant="signal"
          title="Breath: probability of introducing rests between notes"
        />
        <DawKnob
          v-model="noteLength"
          :min="25"
          :max="100"
          :step="5"
          unit="%"
          label="Note length"
          :disabled="isCustom"
          size="sm"
          variant="signal"
          title="Note length: base gate percentage of each rhythm note"
        />
        <DawKnob
          v-model="noteLengthVariation"
          :min="0"
          :max="100"
          :step="5"
          :default-value="DEFAULT_GENERATOR_PARAMS.noteLengthVariation * 100"
          unit="%"
          label="Length var"
          :disabled="isCustom"
          size="sm"
          variant="signal"
          title="Length variation: random deviations around Note length, bounded by the rhythm and next note"
        />
      </div>
      <p class="text-daw-text-muted text-micro mt-2">
        {{
          isCustom
            ? 'Custom pattern sets every onset, rest and length.'
            : 'Breath adds rests. Length var varies each note’s length.'
        }}
      </p>
    </section>

    <section class="border-daw-border border-t pt-2">
      <h3 class="text-daw-text-muted text-micro mb-2 font-semibold">Velocity shape</h3>
      <div class="grid grid-cols-2 items-center justify-items-center gap-x-4">
        <DawKnob
          v-model="accentStrength"
          :min="0"
          :max="100"
          :step="5"
          unit="%"
          label="Accent"
          size="sm"
          variant="signal"
          title="Accent: velocity boost applied to downbeats and metric pulses"
        />
        <DawKnob
          v-model="velocityVariation"
          :min="0"
          :max="100"
          :step="5"
          unit="%"
          label="Velocity Var"
          size="sm"
          variant="signal"
          title="Velocity Variation: subtle humanized dynamic variations per note"
        />
      </div>
      <p class="text-daw-text-muted text-micro mt-2">Beat accents and per-note dynamics.</p>
    </section>
  </DawModule>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { DEFAULT_GENERATOR_PARAMS } from '@/config/defaults'
  import DawKnob from '@/components/common/DawKnob.vue'
  import DawModule from '@/components/common/DawModule.vue'
  import { useModuleOpenState } from '@/composables/useModuleOpenState'
  import { useMelodyStore } from '@/stores/melody.store'

  const melodyStore = useMelodyStore()
  const isOpen = useModuleOpenState('feel')
  const isCustom = computed(() => melodyStore.generatorParams.rhythmMode === 'custom')

  const restProbability = computed({
    get: () => melodyStore.generatorParams.restProbability * 100,
    set: (value: number) => melodyStore.setGeneratorParams({ restProbability: value / 100 })
  })
  const noteLength = computed({
    get: () => melodyStore.generatorParams.noteLength * 100,
    set: (value: number) => melodyStore.setGeneratorParams({ noteLength: value / 100 })
  })
  const accentStrength = computed({
    get: () => melodyStore.generatorParams.accentStrength * 100,
    set: (value: number) => melodyStore.setGeneratorParams({ accentStrength: value / 100 })
  })
  const noteLengthVariation = computed({
    get: () => melodyStore.generatorParams.noteLengthVariation * 100,
    set: (value: number) => melodyStore.setGeneratorParams({ noteLengthVariation: value / 100 })
  })
  const velocityVariation = computed({
    get: () => melodyStore.generatorParams.velocityVariation * 100,
    set: (value: number) => melodyStore.setGeneratorParams({ velocityVariation: value / 100 })
  })

  const feelSummaryBadge = computed(() => {
    return `${Math.round(noteLength.value)}% len · ${Math.round(accentStrength.value)}% acc`
  })
</script>
