<template>
  <fieldset class="text-2xs flex items-center gap-2" :disabled="!ready">
    <legend class="sr-only">Host MIDI channels</legend>
    <label
      class="plugin-midi-route border-daw-border rounded-control text-daw-signal flex h-6 items-center gap-1 border pl-2"
    >
      <Music2 class="h-3 w-3" aria-hidden="true" />
      <span>Melody</span>
      <span class="relative">
        <select
          v-model.number="output.melodyChannel"
          class="text-daw-text focus-visible:ring-daw-signal h-5 w-16 cursor-pointer appearance-none bg-transparent pr-5 pl-2 font-mono focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed"
          title="Host MIDI channel for melody"
        >
          <option :value="0">None</option>
          <option v-for="channel in MIDI_CHANNEL_OPTIONS" :key="channel.value" :value="channel.value">
            {{ channel.label }}
          </option>
        </select>
        <ChevronDown class="pointer-events-none absolute top-1/2 right-1 h-3 w-3 -translate-y-1/2" aria-hidden="true" />
      </span>
    </label>
    <label
      class="plugin-midi-route border-daw-border rounded-control text-daw-chord flex h-6 items-center gap-1 border pl-2"
    >
      <Layers2 class="h-3 w-3" aria-hidden="true" />
      <span>Chords</span>
      <span class="relative">
        <select
          v-model.number="output.chordsChannel"
          class="text-daw-text focus-visible:ring-daw-chord h-5 w-16 cursor-pointer appearance-none bg-transparent pr-5 pl-2 font-mono focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed"
          title="Host MIDI channel for chords"
        >
          <option :value="0">None</option>
          <option v-for="channel in MIDI_CHANNEL_OPTIONS" :key="channel.value" :value="channel.value">
            {{ channel.label }}
          </option>
        </select>
        <ChevronDown class="pointer-events-none absolute top-1/2 right-1 h-3 w-3 -translate-y-1/2" aria-hidden="true" />
      </span>
    </label>
  </fieldset>
</template>

<script setup lang="ts">
  import { ChevronDown, Layers2, Music2 } from '@lucide/vue'
  import type { PluginSession } from '@/core/plugin/session'
  import { MIDI_CHANNEL_OPTIONS } from '@/utils/midi-ui.utils'

  defineProps<{ ready: boolean }>()
  const output = defineModel<PluginSession['output']>({ required: true })
</script>
