<template>
  <DawModule
    v-model="isOpen"
    title="Chord Register"
    role-dot="chord"
    badge-color="chord"
    :badge="`C${harmonyStore.chordRegister}`"
  >
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <span class="text-daw-text-muted text-2xs font-medium">Base Octave</span>
        <span class="text-daw-chord text-2xs font-mono font-bold">
          C{{ harmonyStore.chordRegister }}
          <span class="text-daw-text-muted text-micro font-sans font-normal"> ({{ registerLabel }}) </span>
        </span>
      </div>

      <!-- Stepper + Quick Segmented Selector -->
      <div class="flex min-w-0 items-center gap-1">
        <button
          type="button"
          class="bg-daw-panel border-daw-border text-daw-text-muted hover:text-daw-text hover:bg-daw-surface rounded-control flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-30"
          :disabled="harmonyStore.chordRegister <= MIN_CHORD_REGISTER"
          aria-label="Lower chord octave"
          @click="onSetRegister(harmonyStore.chordRegister - 1)"
        >
          <Minus class="h-3 w-3" />
        </button>

        <DawSegmented
          :model-value="harmonyStore.chordRegister"
          :options="quickOctaves"
          size="sm"
          variant="chord"
          grow
          wrap
          aria-label="Quick octave selection"
          @update:model-value="onSetRegister"
        />

        <button
          type="button"
          class="bg-daw-panel border-daw-border text-daw-text-muted hover:text-daw-text hover:bg-daw-surface rounded-control flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-30"
          :disabled="harmonyStore.chordRegister >= MAX_CHORD_REGISTER"
          aria-label="Raise chord octave"
          @click="onSetRegister(harmonyStore.chordRegister + 1)"
        >
          <Plus class="h-3 w-3" />
        </button>
      </div>

      <p class="text-daw-text-muted text-micro leading-snug">
        Sets the base pitch octave for chords added via palette clicks and progression presets.
      </p>
    </div>
  </DawModule>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Minus, Plus } from '@lucide/vue'
  import DawModule from '@/components/common/DawModule.vue'
  import DawSegmented, { type SegmentOption } from '@/components/common/DawSegmented.vue'
  import { useModuleOpenState } from '@/composables/useModuleOpenState'
  import { MAX_CHORD_REGISTER, MIN_CHORD_REGISTER, useHarmonyStore } from '@/stores/harmony.store'
  import { useUiStore } from '@/stores/ui.store'

  const harmonyStore = useHarmonyStore()
  const uiStore = useUiStore()
  const isOpen = useModuleOpenState('chord-register')

  function onSetRegister(val: number): void {
    uiStore.setActiveTrack('chords')
    harmonyStore.setChordRegister(val)
  }

  const quickOctaves: SegmentOption<number>[] = [
    { label: 'C2', value: 2 },
    { label: 'C3', value: 3 },
    { label: 'C4', value: 4 },
    { label: 'C5', value: 5 }
  ]

  const registerDescriptions: Record<number, string> = {
    1: 'Sub Bass',
    2: 'Low / Bass',
    3: 'Mid / Standard',
    4: 'High',
    5: 'Air / Bright',
    6: 'Ultra High'
  }

  const registerLabel = computed(() => {
    return registerDescriptions[harmonyStore.chordRegister] ?? 'Standard'
  })
</script>
