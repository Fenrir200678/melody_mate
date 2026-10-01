<template>
  <div class="border-daw-border/60 flex flex-col gap-1.5 border-b pb-1.5">
    <!-- Row 1: chord type and base octave -->
    <div class="flex items-center justify-between gap-1.5">
      <DawSegmented
        :model-value="chordMode"
        :options="CHORD_MODE_OPTIONS"
        size="xs"
        variant="chord"
        aria-label="Chord type"
        @update:model-value="(val) => (chordMode = val)"
      />

      <div class="flex items-center gap-1">
        <span class="text-daw-text-muted text-micro font-medium">Oct:</span>
        <DawStepper
          :decrement-disabled="harmonyStore.chordRegister <= MIN_CHORD_REGISTER"
          :increment-disabled="harmonyStore.chordRegister >= MAX_CHORD_REGISTER"
          decrement-title="Lower octave"
          increment-title="Raise octave"
          @decrement="harmonyStore.setChordRegister(harmonyStore.chordRegister - 1)"
          @increment="harmonyStore.setChordRegister(harmonyStore.chordRegister + 1)"
        >
          <template #value>
            <span class="text-daw-chord text-micro w-5 text-center font-mono font-bold">
              C{{ harmonyStore.chordRegister }}
            </span>
          </template>
        </DawStepper>
      </div>
    </div>

    <!-- Row 2: voicing style and the length new chords are created with -->
    <div class="grid grid-cols-2 gap-1.5">
      <div class="flex min-w-0 items-center gap-1">
        <span class="text-daw-text-muted text-micro shrink-0 font-medium">Voice:</span>
        <DawSegmented
          :model-value="harmonyStore.voicingStyle"
          :options="VOICING_STYLE_OPTIONS"
          size="xs"
          variant="chord"
          grow
          aria-label="Voicing style"
          @update:model-value="(val) => harmonyStore.setVoicingStyle(val)"
        />
      </div>

      <div class="flex min-w-0 items-center gap-1">
        <span class="text-daw-text-muted text-micro shrink-0 font-medium">Len:</span>
        <DawSegmented
          :model-value="harmonyStore.defaultChordDuration"
          :options="DEFAULT_DURATION_OPTIONS"
          size="xs"
          variant="chord"
          grow
          aria-label="Default chord length"
          @update:model-value="(val) => harmonyStore.setDefaultChordDuration(val)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import DawSegmented from '@/components/common/DawSegmented.vue'
  import DawStepper from '@/components/common/DawStepper.vue'
  import type { ChordMode } from '@/core/theory/chord.engine'
  import { MAX_CHORD_REGISTER, MIN_CHORD_REGISTER, useHarmonyStore } from '@/stores/harmony.store'
  import { CHORD_MODE_OPTIONS, DEFAULT_DURATION_OPTIONS, VOICING_STYLE_OPTIONS } from '@/utils/harmony/harmonyOptions'

  const chordMode = defineModel<ChordMode>({ required: true })

  const harmonyStore = useHarmonyStore()
</script>
