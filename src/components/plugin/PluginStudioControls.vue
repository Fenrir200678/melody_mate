<template>
  <nav class="plugin-header-studios" aria-label="Studios">
    <DawButton
      :icon="Layers2"
      :active="ui.isChordStudioOpen"
      :aria-pressed="ui.isChordStudioOpen"
      :disabled="!ready"
      appearance="ghost"
      variant="chord"
      title="Chord Studio (C)"
      @click="ui.toggleChordStudio()"
      >Chords</DawButton
    >
    <DawButton
      :icon="AudioLines"
      :active="ui.isRhythmStudioOpen"
      :aria-pressed="ui.isRhythmStudioOpen"
      :disabled="!ready"
      appearance="ghost"
      variant="pulse"
      title="Rhythm Studio (R)"
      @click="ui.toggleRhythmStudio()"
      >Rhythm</DawButton
    >
    <DawButton
      :icon="WandSparkles"
      :active="ui.isArpStudioOpen"
      :aria-pressed="ui.isArpStudioOpen"
      :disabled="!ready"
      appearance="ghost"
      variant="signal"
      title="Arp Studio (A)"
      @click="ui.toggleArpStudio()"
      >Arp</DawButton
    >
  </nav>
</template>

<script setup lang="ts">
  import { AudioLines, Layers2, WandSparkles } from '@lucide/vue'
  import DawButton from '../common/DawButton.vue'
  import { useUiStore } from '@/stores/ui.store'

  defineProps<{ ready: boolean }>()
  const ui = useUiStore()
</script>
