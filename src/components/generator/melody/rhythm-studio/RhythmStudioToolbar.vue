<template>
  <div class="rhythm-studio__toolbar flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
    <!-- Length Selection -->
    <div class="flex items-center gap-1" role="group" aria-label="Insert note length">
      <span class="text-daw-text-muted text-micro mr-1">Length</span>
      <button
        v-for="length in lengths"
        :key="length.steps"
        type="button"
        class="rhythm-studio__length"
        :class="{ 'is-selected': selectedLength === length.steps }"
        :aria-pressed="selectedLength === length.steps"
        :aria-label="'Insert ' + length.name"
        @click="selectedLength = length.steps"
      >
        {{ length.label }}
      </button>
    </div>

    <span class="rhythm-studio__separator" aria-hidden="true" />

    <!-- Bars Selection -->
    <div class="flex items-center gap-1" role="group" aria-label="Pattern length in bars">
      <span class="text-daw-text-muted text-micro mr-1">Bars</span>
      <button
        v-for="bars in barOptions"
        :key="bars"
        type="button"
        class="rhythm-studio__length rhythm-studio__bar"
        :class="{ 'is-selected': pattern.bars === bars }"
        :aria-pressed="pattern.bars === bars"
        @click="requestBars(bars)"
      >
        {{ bars }}
      </button>
    </div>

    <!-- Actions (Save, Duplicate, Copy, Clear) -->
    <div class="ml-auto flex items-center gap-1">
      <DawButton
        v-if="activeSavedPreset"
        size="xs"
        appearance="primary"
        variant="signal"
        :icon="Save"
        :disabled="!hasUnsavedChanges || !pattern.events.length"
        :title="`Save changes to ${activeSavedPreset.name}`"
        @click="emit('saveChanges')"
      >
        Save changes
      </DawButton>
      <DawButton
        size="xs"
        appearance="primary"
        variant="signal"
        :icon="Save"
        :disabled="!pattern.events.length"
        title="Save the current pattern as a new rhythm"
        @click="emit('openSaveDialog')"
      >
        Save as new
      </DawButton>
      <DawButton
        size="xs"
        appearance="surface"
        :icon="Copy"
        :disabled="pattern.bars >= 4"
        @click="store.duplicateBar(pattern.bars - 1)"
      >
        Duplicate bar
      </DawButton>
      <DawButton
        size="xs"
        appearance="surface"
        :icon="Copy"
        :disabled="!currentPreset"
        :title="currentPreset ? `Copy ${currentPreset.name} into the custom pattern` : 'No rhythm preset selected'"
        @click="store.copyCurrentPreset()"
      >
        <span>Copy preset:</span>
        <span class="text-daw-signal ml-0.5 font-mono">{{ currentPreset?.name ?? 'None' }}</span>
      </DawButton>
      <DawButton
        size="xs"
        appearance="surface"
        :icon="Copy"
        :title="`Copy Euclidean ${euclideanSourceLabel} into the custom pattern. Random rests and note-length scaling are not copied.`"
        @click="store.copyCurrentEuclidean()"
      >
        Copy Euclid: {{ euclideanSourceLabel }}
      </DawButton>
      <DawButton
        size="xs"
        appearance="surface"
        variant="danger"
        :icon="Trash2"
        :disabled="!pattern.events.length"
        @click="store.clear()"
      >
        Clear pattern
      </DawButton>
    </div>
  </div>

  <!-- Confirm Bars Change Alert -->
  <div
    v-if="pendingBars !== null"
    class="rhythm-studio__confirm flex shrink-0 items-center gap-2 px-3 pb-2"
    role="group"
    aria-label="Confirm pattern length change"
  >
    <span class="text-daw-text-muted text-2xs">
      Changing to {{ pendingBars }} {{ pendingBars === 1 ? 'bar' : 'bars' }} will affect
      {{ affectedEventCount }} events.
    </span>
    <DawButton size="xs" appearance="surface" @click="pendingBars = null">Cancel</DawButton>
    <DawButton size="xs" appearance="primary" variant="signal" @click="confirmBars">Confirm</DawButton>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { Copy, Save, Trash2 } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import { getRhythmPresetById } from '@/core/rhythm/presets'
  import { useMelodyStore } from '@/stores/melody.store'
  import { useRhythmStore } from '@/stores/rhythm.store'

  const selectedLength = defineModel<number>('selectedLength', { default: 4 })

  const emit = defineEmits<{
    openSaveDialog: []
    saveChanges: []
  }>()

  const store = useRhythmStore()
  const melodyStore = useMelodyStore()

  const pattern = computed(() => store.pattern)
  const activeSavedPreset = computed(() => store.savedPresets.find((item) => item.id === store.activeSavedPresetId))
  const hasUnsavedChanges = computed(
    () => !!activeSavedPreset.value && JSON.stringify(activeSavedPreset.value.pattern) !== JSON.stringify(pattern.value)
  )

  const lengths = [
    { steps: 1, label: '1/16', name: 'a sixteenth note' },
    { steps: 2, label: '1/8', name: 'an eighth note' },
    { steps: 3, label: '1/8.', name: 'a dotted eighth note' },
    { steps: 4, label: '1/4', name: 'a quarter note' },
    { steps: 6, label: '1/4.', name: 'a dotted quarter note' },
    { steps: 8, label: '1/2', name: 'a half note' },
    { steps: 12, label: '1/2.', name: 'a dotted half note' },
    { steps: 16, label: '1/1', name: 'a whole note' }
  ]

  const barOptions = [1, 2, 3, 4] as const
  const pendingBars = ref<(typeof barOptions)[number] | null>(null)

  const currentPreset = computed(() => getRhythmPresetById(melodyStore.generatorParams.rhythmPresetId))
  const euclideanSourceLabel = computed(() => {
    const params = melodyStore.generatorParams
    return `E(${params.euclideanPulses}/${params.euclideanSteps})`
  })

  const affectedEventCount = computed(() => {
    if (pendingBars.value === null) return 0
    const end = pendingBars.value * 16
    return pattern.value.events.filter(
      (event: { step: number; lengthSteps: number }) => event.step >= end || event.step + event.lengthSteps > end
    ).length
  })

  function requestBars(bars: (typeof barOptions)[number]): void {
    if (bars === pattern.value.bars) return
    if (bars < pattern.value.bars) pendingBars.value = bars
    else store.resizeBars(bars)
  }

  function confirmBars(): void {
    if (pendingBars.value !== null) store.resizeBars(pendingBars.value)
    pendingBars.value = null
  }
</script>
