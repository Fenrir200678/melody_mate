<template>
  <div
    v-if="selectedChord"
    class="border-daw-border bg-daw-panel flex shrink-0 items-center justify-between border-t px-3 py-2 text-xs select-none"
  >
    <!-- Left: identity, harmonic role, timing and the current voicing -->
    <div class="flex items-center gap-3">
      <ChordIdentityBar
        :chord="selectedChord"
        :chord-function="chordFunction"
        :timing-label="timingLabel"
        @audition="audition"
      />

      <div class="bg-daw-border/60 h-6 w-px" />

      <VoicingEditor :voicing="selectedChord.voicing" @transpose="transposeOctave" />
    </div>

    <!-- Center: inversion and duration -->
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1.5">
        <span class="text-daw-text-muted text-micro font-medium">Inv:</span>
        <DawSegmented
          :model-value="selectedChord.inversion ?? 0"
          :options="inversionOptions"
          size="xs"
          variant="chord"
          aria-label="Chord inversion"
          @update:model-value="onInversionChange"
        />
      </div>

      <div class="flex items-center gap-1.5">
        <span class="text-daw-text-muted text-micro font-medium">Length:</span>
        <DawSegmented
          :model-value="selectedChord.durationBars"
          :options="CHORD_DURATION_OPTIONS"
          size="xs"
          variant="chord"
          aria-label="Chord duration"
          @update:model-value="setDuration"
        />
      </div>
    </div>

    <!-- Right: voice leading context and progression management -->
    <div class="flex items-center gap-3">
      <VoiceLeadingReadout
        v-if="harmonyStore.chords.length > 1"
        :prev-distance="prevDistance"
        :next-distance="nextDistance"
      />

      <div class="bg-daw-border/60 h-6 w-px" />

      <ChordActions
        :can-move-left="selectedIndex > 0"
        :can-move-right="selectedIndex < harmonyStore.chords.length - 1"
        @move-left="reorder('up')"
        @move-right="reorder('down')"
        @duplicate="duplicate"
        @remove="remove"
      />
    </div>
  </div>

  <div
    v-else
    class="border-daw-border bg-daw-panel/50 text-daw-text-muted text-micro flex shrink-0 items-center justify-center border-t py-2"
  >
    <span>Select a chord in the timeline to edit its inversion, voicing, and duration.</span>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import DawSegmented from '@/components/common/DawSegmented.vue'
  import { useSelectedChord } from '@/composables/harmony/useSelectedChord'
  import { useHarmonyStore } from '@/stores/harmony.store'
  import { CHORD_DURATION_OPTIONS, availableInversions } from '@/utils/harmony/harmonyOptions'
  import ChordActions from './inspector/ChordActions.vue'
  import ChordIdentityBar from './inspector/ChordIdentityBar.vue'
  import VoicingEditor from './inspector/VoicingEditor.vue'
  import VoiceLeadingReadout from './inspector/VoiceLeadingReadout.vue'

  const harmonyStore = useHarmonyStore()

  const {
    selectedChord,
    selectedIndex,
    chordFunction,
    timingLabel,
    prevDistance,
    nextDistance,
    audition,
    transposeOctave,
    setInversion,
    setDuration,
    reorder,
    duplicate,
    remove
  } = useSelectedChord()

  const inversionOptions = computed(() => availableInversions(selectedChord.value?.voicing.length ?? 3))

  function onInversionChange(inversion: number): void {
    setInversion(inversion as 0 | 1 | 2 | 3)
  }
</script>
