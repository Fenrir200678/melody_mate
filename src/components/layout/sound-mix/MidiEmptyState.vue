<template>
  <div
    class="border-daw-border bg-daw-panel rounded-control flex flex-col items-center justify-center gap-3 border p-8 text-center"
    role="region"
    aria-label="MIDI Output setup"
  >
    <div
      class="bg-daw-signal/10 text-daw-signal border-daw-signal/20 flex h-12 w-12 items-center justify-center rounded-full border"
      aria-hidden="true"
    >
      <Cable class="h-6 w-6" />
    </div>

    <div class="flex max-w-md flex-col gap-1">
      <h3 class="text-daw-text text-sm font-semibold tracking-wide uppercase">
        Web MIDI Output Workstation
        <span class="text-micro text-daw-text-muted font-mono font-normal tracking-normal lowercase">(experimental)</span>
      </h3>
      <p class="text-daw-text-muted text-2xs font-mono leading-relaxed">
        Route live melody and chord progressions directly into hardware synthesizers, virtual MIDI loopback cables (IAC
        / loopMIDI), or your DAW.
      </p>
    </div>

    <DawButton
      size="sm"
      variant="signal"
      :icon="Plug"
      :disabled="isConnecting || isUnsupported"
      :disabled-reason="disabledReason"
      aria-label="Enable Web MIDI output access"
      @click="$emit('enable')"
    >
      {{ isConnecting ? 'Connecting to MIDI…' : 'Enable Web MIDI' }}
    </DawButton>

    <div class="text-daw-text-muted text-micro flex flex-wrap items-center justify-center gap-3 font-mono">
      <span class="flex items-center gap-1">
        <span class="bg-daw-signal h-1.5 w-1.5 rounded-full" />
        Sample-accurate clock sync
      </span>
      <span class="flex items-center gap-1">
        <span class="bg-daw-chord h-1.5 w-1.5 rounded-full" />
        Dual track routing (Lead &amp; Chords)
      </span>
      <span class="flex items-center gap-1">
        <span class="bg-daw-pulse h-1.5 w-1.5 rounded-full" />
        ±200 ms latency offset
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Cable, Plug } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'

  defineProps<{
    isConnecting?: boolean
    isUnsupported?: boolean
    disabledReason?: string
  }>()

  defineEmits<{
    enable: []
  }>()
</script>
