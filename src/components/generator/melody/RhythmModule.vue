<template>
  <DawModule
    v-model="isOpen"
    data-module-key="rhythm"
    :title="uiStore.isArpStudioOpen ? 'Arp Studio' : 'Rhythm'"
    :role-dot="uiStore.isArpStudioOpen ? 'signal' : 'pulse'"
    :badge-color="uiStore.isArpStudioOpen ? 'signal' : 'pulse'"
  >
    <template #badge>
      <span class="text-micro font-mono" :class="uiStore.isArpStudioOpen ? 'text-daw-signal' : 'text-daw-pulse'">
        {{ activeBadgeLabel }}
      </span>
    </template>

    <template #actions>
      <DawIconButton
        v-if="isPresetMode && !uiStore.isArpStudioOpen"
        :icon="Shuffle"
        size="xs"
        appearance="panel"
        variant="pulse"
        :active="melodyStore.generatorParams.randomRhythmPreset"
        aria-label="Randomize the rhythm preset on every generate"
        title="Random preset on every generate"
        @click.stop="melodyStore.toggleRandomRhythmPreset"
      />
    </template>

    <!-- Arp Studio Active Callout -->
    <div v-if="uiStore.isArpStudioOpen" class="flex flex-col gap-2 p-0.5">
      <div class="rounded-panel border-daw-border bg-daw-surface text-2xs flex flex-col gap-2 p-2.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <ArrowUpDown class="text-daw-signal h-3.5 w-3.5" />
            <span class="text-daw-text font-semibold">Arp Studio Dock Active</span>
          </div>
          <span class="text-daw-signal text-micro font-mono">Running</span>
        </div>
        <p class="text-daw-text-muted text-micro leading-relaxed">
          Arpeggio patterns, rate, and pitch source are configured in the Arp Studio dock at the bottom.
        </p>
        <div class="border-daw-border/60 flex items-center justify-between border-t pt-1.5">
          <span class="text-daw-text-muted text-micro"
            >Press <kbd class="text-daw-text font-mono font-semibold">G</kbd> to Generate</span
          >
          <DawButton size="xs" appearance="ghost" @click="uiStore.setArpStudioOpen(false)"> Close Dock </DawButton>
        </div>
      </div>
    </div>

    <!-- Standard Rhythm Engine (when Arp Studio is closed) -->
    <template v-else>
      <!-- Engine Switcher -->
      <DawSegmented
        :model-value="melodyStore.generatorParams.rhythmMode"
        :options="rhythmModeOptions"
        size="sm"
        variant="pulse"
        grow
        class="w-full"
        aria-label="Rhythm engine"
        @update:model-value="setRhythmMode"
      />

      <!-- Presets Mode -->
      <RhythmPresetPicker v-if="isPresetMode" />

      <!-- Euclidean Mode -->
      <EuclideanGenerator v-else-if="melodyStore.generatorParams.rhythmMode === 'euclidean'" />

      <!-- Custom Mode -->
      <div v-else class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-1.5 px-0.5">
          <span class="text-daw-text-muted text-micro">Edit in Rhythm Studio</span>
          <DawButton
            size="xs"
            appearance="surface"
            variant="pulse"
            :active="uiStore.isRhythmStudioOpen"
            :icon="AudioLines"
            :aria-expanded="uiStore.isRhythmStudioOpen"
            aria-controls="rhythm-studio-dock"
            :title="uiStore.isRhythmStudioOpen ? 'Rhythm Studio is open (Click to close)' : 'Open Rhythm Studio (R)'"
            @click="uiStore.toggleRhythmStudio()"
          >
            {{ uiStore.isRhythmStudioOpen ? 'Dock open' : 'Open' }}
          </DawButton>
        </div>
        <CustomRhythmPresets />
        <p v-if="projectStore.swing > 0 || projectStore.timingLooseness > 0" class="text-daw-text-muted text-micro">
          Project swing and timing looseness affect playback and MIDI export.
        </p>
      </div>
    </template>
  </DawModule>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { ArrowUpDown, AudioLines, Shuffle } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawIconButton from '@/components/common/DawIconButton.vue'
  import DawModule from '@/components/common/DawModule.vue'
  import DawSegmented, { type SegmentOption } from '@/components/common/DawSegmented.vue'
  import EuclideanGenerator from '@/components/generator/melody/EuclideanGenerator.vue'
  import CustomRhythmPresets from '@/components/generator/melody/CustomRhythmPresets.vue'
  import RhythmPresetPicker from '@/components/generator/melody/RhythmPresetPicker.vue'
  import { useModuleOpenState } from '@/composables/useModuleOpenState'
  import { getRhythmPresetById } from '@/core/rhythm/presets'
  import type { RhythmMode } from '@/core/schemas/generator.schema'
  import { useMelodyStore } from '@/stores/melody.store'
  import { useRhythmStore } from '@/stores/rhythm.store'
  import { useUiStore } from '@/stores/ui.store'
  import { useProjectStore } from '@/stores/project.store'

  const melodyStore = useMelodyStore()
  const rhythmStore = useRhythmStore()
  const uiStore = useUiStore()
  const projectStore = useProjectStore()
  const isOpen = useModuleOpenState('rhythm')

  const isPresetMode = computed(() => melodyStore.generatorParams.rhythmMode === 'preset')
  const activeSavedPreset = computed(() =>
    rhythmStore.savedPresets.find((item) => item.id === rhythmStore.activeSavedPresetId)
  )

  const activeRhythmLabel = computed(() => {
    if (melodyStore.generatorParams.rhythmMode === 'custom') {
      const name = activeSavedPreset.value?.name ?? 'Custom'
      return `${name} · ${rhythmStore.pattern.bars} ${rhythmStore.pattern.bars === 1 ? 'bar' : 'bars'} · ${rhythmStore.pattern.events.length} hits`
    }
    if (!isPresetMode.value) {
      const sub = melodyStore.generatorParams.euclideanSubdivision || '16n'
      return `E(${melodyStore.generatorParams.euclideanPulses}/${melodyStore.generatorParams.euclideanSteps}, ${sub})`
    }
    const preset = getRhythmPresetById(melodyStore.generatorParams.rhythmPresetId)
    return preset ? preset.name : melodyStore.generatorParams.rhythmPresetId
  })

  const activeBadgeLabel = computed(() => {
    if (uiStore.isArpStudioOpen) {
      return `${melodyStore.generatorParams.arpPattern.toUpperCase()} · ${melodyStore.generatorParams.arpRate}`
    }
    return activeRhythmLabel.value
  })

  const rhythmModeOptions: SegmentOption<RhythmMode>[] = [
    { label: 'Presets', value: 'preset', title: 'Curated rhythm presets and groove patterns' },
    { label: 'Euclidean', value: 'euclidean', title: 'Mathematical Euclidean rhythm pulse generator' },
    { label: 'Custom', value: 'custom', title: 'Custom multi-bar rhythm patterns from Rhythm Studio' }
  ]

  function setRhythmMode(mode: RhythmMode): void {
    melodyStore.setRhythmMode(mode)
  }
</script>
