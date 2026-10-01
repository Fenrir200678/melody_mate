<template>
  <div class="synth-rack" aria-label="Sound preview and mix rack">
    <div class="mixer-strip">
      <SoundTrackModule track="lead" title="Melody" variant="signal" />
      <SoundTrackModule track="chord" title="Chords" variant="chord" />
      <MasterBusModule />
    </div>
  </div>
</template>

<script setup lang="ts">
  import MasterBusModule from './synth/MasterBusModule.vue'
  import SoundTrackModule from './synth/SoundTrackModule.vue'
</script>
