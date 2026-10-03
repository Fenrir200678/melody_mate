<template>
  <div
    class="border-daw-border bg-daw-surface rounded-control flex flex-col gap-1 border px-2 py-1.5 transition-colors"
    :class="{ 'border-daw-danger/40': summary.isWarning }"
  >
    <!-- Route info row & edit link -->
    <div class="text-micro flex items-center justify-between gap-1.5">
      <div class="flex min-w-0 items-center gap-1.5">
        <span class="text-daw-text-muted font-semibold tracking-wider uppercase">Out:</span>
        <button
          type="button"
          class="cursor-pointer truncate font-mono font-medium hover:underline focus-visible:outline-none"
          :class="modeTextClass"
          :title="summary.tooltip"
          @click="openMidiView"
        >
          {{ summary.text }}
        </button>
      </div>

      <!-- Actions: Switch to internal or open MIDI routing tab -->
      <div class="flex shrink-0 items-center gap-2">
        <button
          v-if="route.mode !== 'internal'"
          type="button"
          class="text-daw-signal hover:text-daw-text text-micro cursor-pointer font-mono font-medium hover:underline focus-visible:outline-none"
          title="Switch output back to Internal synthesizer"
          @click="setToInternal"
        >
          Internal
        </button>
        <button
          type="button"
          class="text-daw-text-muted hover:text-daw-signal text-micro cursor-pointer font-mono hover:underline focus-visible:outline-none"
          title="Open MIDI routing settings"
          @click="openMidiView"
        >
          Edit ↗
        </button>
      </div>
    </div>

    <!-- MIDI-only hint: internal sound & fader do not affect external MIDI -->
    <div
      v-if="route.mode === 'midi'"
      class="text-daw-text-muted text-micro border-daw-border/50 border-t pt-1 font-mono leading-tight"
    >
      External only · Synth controls &amp; fader do not affect MIDI output
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import type { MidiTrackKey } from '@/core/midi/output.types'
  import { useMidiOutputStore } from '@/stores/midi-output.store'
  import { useUiStore } from '@/stores/ui.store'
  import { formatRoutingSummary } from '@/utils/midi-ui.utils'

  const props = defineProps<{
    track: MidiTrackKey
    variant: 'signal' | 'chord'
  }>()

  const midiStore = useMidiOutputStore()
  const uiStore = useUiStore()

  const route = computed(() => midiStore.settings[props.track])
  const routeStatus = computed(() => midiStore.snapshot.routes[props.track]?.status ?? 'not-enabled')

  const summary = computed(() =>
    formatRoutingSummary(route.value.mode, route.value.port, route.value.channel, routeStatus.value)
  )

  const modeTextClass = computed(() => {
    if (summary.value.isWarning) return 'text-daw-danger'
    if (route.value.mode === 'internal') return 'text-daw-text-muted'
    return props.variant === 'chord' ? 'text-daw-chord' : 'text-daw-signal'
  })

  function openMidiView(): void {
    uiStore.setSoundDockView('midi')
  }

  async function setToInternal(): Promise<void> {
    await midiStore.setRoute(props.track, { ...route.value, mode: 'internal' })
  }
</script>
