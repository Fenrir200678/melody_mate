<template>
  <footer
    class="daw-footer bg-daw-panel border-daw-border text-daw-text-muted z-30 flex items-center justify-between border-t px-4 py-3 select-none"
  >
    <!-- Left: Notes Count Chip & Master Status -->
    <DawFooterStatus />

    <!-- Center: Studios & Sound Controls (Rhythm Studio, Chord Studio, Sound & Mix) -->
    <DawFooterStudios />

    <!-- Right: History (Undo/Redo), Reset Settings, Export MIDI -->
    <DawFooterActions />
  </footer>
</template>

<script setup lang="ts">
  import DawFooterActions from './footer/DawFooterActions.vue'
  import DawFooterStatus from './footer/DawFooterStatus.vue'
  import DawFooterStudios from './footer/DawFooterStudios.vue'
</script>
