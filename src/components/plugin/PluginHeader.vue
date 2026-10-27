<template>
  <header class="plugin-header bg-daw-panel border-daw-border text-daw-text shrink-0 border-b">
    <div class="plugin-header-main">
      <DawHeaderBrand />
      <div class="plugin-header-create">
        <MelodyGenerateControls />
        <div class="bg-daw-surface/60 border-daw-border rounded-control flex items-center border p-1">
          <DawProjectSettings />
        </div>
      </div>
      <PluginStudioControls :ready="ready" />
      <DawHeaderActions class="ml-auto" />
    </div>
    <div class="plugin-header-bottom bg-daw-bg/40 border-daw-border border-t">
      <PluginHostStatus
        class="plugin-header-status"
        :status="audio.initializationError ?? status"
        :host-bpm="hostBpm"
        :ready="ready"
      />
      <div class="plugin-header-routing" role="group" aria-label="Host MIDI output">
        <DawToggle
          v-model="output.enabled"
          appearance="button"
          size="sm"
          :full-width="false"
          :icon="Cable"
          label="MIDI out"
          :disabled="!ready"
          title="Send melody and chords to the DAW"
        />
        <PluginMidiRouting v-model="output" :ready="ready" />
        <span class="bg-daw-border h-4 w-px" aria-hidden="true" />
        <DawToggle
          v-model="output.repeat"
          appearance="button"
          size="sm"
          :full-width="false"
          :icon="Repeat2"
          :show-dot="false"
          label="Repeat"
          :disabled="!ready"
          title="Repeat the complete project from the beginning of the DAW timeline"
        />
        <DawButton
          :icon="OctagonX"
          size="sm"
          appearance="ghost"
          variant="danger"
          title="Release all held notes on the next DAW callback"
          @click="audio.panic()"
          >Panic</DawButton
        >
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
  import { Cable, OctagonX, Repeat2 } from '@lucide/vue'
  import DawHeaderBrand from '../layout/header/DawHeaderBrand.vue'
  import DawHeaderActions from '../layout/header/DawHeaderActions.vue'
  import DawProjectSettings from '../layout/header/DawProjectSettings.vue'
  import MelodyGenerateControls from '../generator/MelodyGenerateControls.vue'
  import DawButton from '../common/DawButton.vue'
  import DawToggle from '../common/DawToggle.vue'
  import PluginMidiRouting from './PluginMidiRouting.vue'
  import PluginStudioControls from './PluginStudioControls.vue'
  import PluginHostStatus from './PluginHostStatus.vue'
  import { useAudioStore } from '@/stores/audio.store'
  import type { PluginSession } from '@/core/plugin/session'

  defineProps<{ status: string; hostBpm: number | null; ready: boolean }>()
  const output = defineModel<PluginSession['output']>('output', { required: true })
  const audio = useAudioStore()
</script>
