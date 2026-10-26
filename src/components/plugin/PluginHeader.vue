<template>
  <header class="bg-daw-panel border-daw-border flex shrink-0 flex-wrap items-center gap-2 border-b p-2">
    <DawHeaderBrand />
    <MelodyGenerateControls />
    <DawProjectSettings />
    <DawButton
      size="sm"
      appearance="surface"
      :disabled="!ready"
      @click="melody.setNotes(DEFAULT_PLUGIN_DEMO_NOTES.map((note) => ({ ...note })))"
      >Demo melody</DawButton
    >
    <DawButton size="sm" appearance="ghost" @click="ui.toggleChordStudio()">Chords</DawButton>
    <DawButton size="sm" appearance="ghost" @click="ui.toggleRhythmStudio()">Rhythm</DawButton>
    <DawButton size="sm" appearance="ghost" @click="ui.toggleArpStudio()">Arp</DawButton>
    <label class="text-2xs flex items-center gap-1"
      ><input v-model="output.enabled" type="checkbox" /> MIDI output</label
    >
    <label class="text-2xs flex items-center gap-1"
      ><input v-model="output.repeat" type="checkbox" /> Repeat project</label
    >
    <DawButton size="sm" appearance="ghost" @click="audio.panic()">Panic</DawButton>
    <DawHeaderActions class="ml-auto" />
    <div class="text-daw-text-muted text-2xs flex w-full flex-wrap items-center gap-2" role="status">
      <span class="font-mono">Host {{ hostBpm === null ? 'timing unavailable' : `${hostBpm.toFixed(1)} BPM` }}</span>
      <span>{{ status }}</span>
      <span>{{
        audio.initializationError ?? 'Start/stop and seek in the DAW. Drag melody using the native handle above.'
      }}</span>
    </div>
  </header>
</template>

<script setup lang="ts">
  import DawHeaderBrand from '../layout/header/DawHeaderBrand.vue'
  import DawHeaderActions from '../layout/header/DawHeaderActions.vue'
  import DawProjectSettings from '../layout/header/DawProjectSettings.vue'
  import MelodyGenerateControls from '../generator/MelodyGenerateControls.vue'
  import DawButton from '../common/DawButton.vue'
  import { DEFAULT_PLUGIN_DEMO_NOTES } from '@/config/defaults'
  import { useMelodyStore } from '@/stores/melody.store'
  import { useUiStore } from '@/stores/ui.store'
  import { useAudioStore } from '@/stores/audio.store'
  import type { PluginSession } from '@/core/plugin/session'

  defineProps<{ status: string; hostBpm: number | null; ready: boolean }>()
  const output = defineModel<PluginSession['output']>('output', { required: true })
  const melody = useMelodyStore()
  const ui = useUiStore()
  const audio = useAudioStore()
</script>
