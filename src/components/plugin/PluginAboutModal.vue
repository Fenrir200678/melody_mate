<template>
  <DawModal v-model="open" title="Melody Mate Plugin Prototype">
    <p class="text-daw-text text-sm">
      Shared Vue editor with native JUCE MIDI output. Use a receiving DAW instrument to hear the sequence.
    </p>
    <p class="text-daw-text-muted mt-2 text-xs">
      macOS VST3 feasibility build · JUCE 9.0.4 · No browser audio, Web MIDI or analytics.
    </p>
    <p class="text-daw-text-muted mt-2 text-xs">
      Host transport controls playback. The sequence repeats from host PPQ zero when Repeat project is enabled.
      Piano-roll loop markers remain editing references.
    </p>
  </DawModal>
</template>
<script setup lang="ts">
  import DawModal from '../common/DawModal.vue'
  const open = defineModel<boolean>({ required: true })
</script>
