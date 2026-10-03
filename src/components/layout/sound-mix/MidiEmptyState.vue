<template>
  <div
    class="border-daw-border bg-daw-panel/50 rounded-panel relative flex flex-col items-center justify-center overflow-hidden border p-6 text-center sm:p-8"
    role="region"
    aria-label="MIDI Output setup"
  >
    <!-- Ambient subtle background glow -->
    <div
      class="bg-daw-signal/5 pointer-events-none absolute -top-20 left-1/2 h-40 w-80 -translate-x-1/2 rounded-full blur-3xl"
      aria-hidden="true"
    />

    <!-- Header chip -->
    <div
      class="border-daw-signal/30 bg-daw-signal/10 text-daw-signal rounded-chip text-micro inline-flex items-center gap-1.5 border px-2.5 py-0.5 font-mono"
    >
      <span class="bg-daw-signal h-1.5 w-1.5 animate-pulse rounded-full" aria-hidden="true" />
      <span>Hardware &amp; DAW Sync</span>
      <span class="text-daw-text-muted/60">·</span>
      <span class="text-daw-text-muted font-normal lowercase">experimental</span>
    </div>

    <!-- Center Icon Hero Graphic -->
    <div class="relative my-2.5 flex items-center justify-center">
      <div
        class="border-daw-border bg-daw-surface rounded-panel flex h-14 w-14 items-center justify-center border shadow-md shadow-black/40"
        aria-hidden="true"
      >
        <Cable class="text-daw-signal h-7 w-7" />
      </div>
      <div
        class="border-daw-panel bg-daw-signal text-daw-bg rounded-chip text-micro absolute -right-1.5 -bottom-1.5 flex h-5 w-5 items-center justify-center border-2 font-bold shadow-xs"
        aria-hidden="true"
      >
        <Zap class="h-2.5 w-2.5" />
      </div>
    </div>

    <!-- Title & Tagline -->
    <div class="flex max-w-lg flex-col gap-1.5">
      <h3 class="text-daw-text font-ui text-sm font-bold tracking-tight sm:text-base">Web MIDI Output Workstation</h3>
      <p class="text-daw-text-muted font-ui text-xs leading-relaxed">
        Stream live generative melodies and chord progressions directly into hardware synthesizers, virtual MIDI
        loopback cables (IAC / loopMIDI), or your DAW with sub-millisecond precision.
      </p>
    </div>

    <!-- Action buttons -->
    <div class="mt-2 flex flex-wrap items-center justify-center gap-2">
      <DawButton
        size="md"
        appearance="primary"
        variant="signal"
        :icon="Plug"
        :disabled="isConnecting || isUnsupported"
        :disabled-reason="disabledReason"
        aria-label="Enable Web MIDI output access"
        @click="$emit('enable')"
      >
        {{ isConnecting ? 'Connecting to MIDI…' : 'Enable Web MIDI' }}
      </DawButton>

      <DawButton
        size="md"
        appearance="panel"
        :icon="BookOpen"
        aria-label="Open DAW routing guide"
        title="View setup instructions for macOS, Windows, and hardware synths"
        @click="$emit('openGuide')"
      >
        Routing Guide
      </DawButton>
    </div>

    <!-- Unsupported / Insecure context banner -->
    <div
      v-if="isUnsupported"
      class="border-daw-danger/40 bg-daw-danger/10 text-daw-danger rounded-control text-micro mt-2 flex items-center gap-2 border px-3 py-1.5 font-mono"
      role="alert"
    >
      <AlertCircle class="h-3.5 w-3.5 shrink-0" />
      <span>{{
        disabledReason || 'Web MIDI is not supported in this browser. Please use Chrome, Edge, or Opera.'
      }}</span>
    </div>

    <!-- 3-Feature Cards Grid -->
    <div class="mt-4 grid w-full max-w-2xl grid-cols-1 gap-2.5 text-left sm:grid-cols-3">
      <!-- Feature 1: Clock Sync -->
      <div
        class="border-daw-border bg-daw-surface/50 rounded-control hover:bg-daw-surface/80 flex flex-col gap-1.5 border p-2.5 transition-colors"
      >
        <div class="flex items-center gap-1.5">
          <div
            class="bg-daw-signal/15 border-daw-signal/30 text-daw-signal rounded-chip flex h-5 w-5 shrink-0 items-center justify-center border"
            aria-hidden="true"
          >
            <Clock class="h-3 w-3" />
          </div>
          <span class="text-daw-text text-2xs font-semibold">Clock &amp; Timing</span>
        </div>
        <p class="text-daw-text-muted font-ui text-micro leading-relaxed">
          Sample-accurate event scheduling aligned directly with Tone.js playback.
        </p>
      </div>

      <!-- Feature 2: Dual Track Routing -->
      <div
        class="border-daw-border bg-daw-surface/50 rounded-control hover:bg-daw-surface/80 flex flex-col gap-1.5 border p-2.5 transition-colors"
      >
        <div class="flex items-center gap-1.5">
          <div
            class="bg-daw-chord/15 border-daw-chord/30 text-daw-chord rounded-chip flex h-5 w-5 shrink-0 items-center justify-center border"
            aria-hidden="true"
          >
            <Split class="h-3 w-3" />
          </div>
          <span class="text-daw-text text-2xs font-semibold">Dual Track Routing</span>
        </div>
        <p class="text-daw-text-muted font-ui text-micro leading-relaxed">
          Independent MIDI ports, channels, and transpose for Melody and Chords.
        </p>
      </div>

      <!-- Feature 3: Latency Offset -->
      <div
        class="border-daw-border bg-daw-surface/50 rounded-control hover:bg-daw-surface/80 flex flex-col gap-1.5 border p-2.5 transition-colors"
      >
        <div class="flex items-center gap-1.5">
          <div
            class="bg-daw-pulse/15 border-daw-pulse/30 text-daw-pulse rounded-chip flex h-5 w-5 shrink-0 items-center justify-center border"
            aria-hidden="true"
          >
            <SlidersHorizontal class="h-3 w-3" />
          </div>
          <span class="text-daw-text text-2xs font-semibold">Latency Offset</span>
        </div>
        <p class="text-daw-text-muted font-ui text-micro leading-relaxed">
          Fine-tune ±200 ms compensation to eliminate external hardware delay.
        </p>
      </div>
    </div>

    <!-- Supported Platforms / Targets -->
    <div
      class="text-daw-text-muted text-micro mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono"
    >
      <span class="text-daw-text-muted/60">Target devices:</span>
      <span class="flex items-center gap-1">
        <span class="bg-daw-signal h-1 w-1 rounded-full" aria-hidden="true" />
        macOS IAC Bus
      </span>
      <span class="flex items-center gap-1">
        <span class="bg-daw-chord h-1 w-1 rounded-full" aria-hidden="true" />
        Windows loopMIDI
      </span>
      <span class="flex items-center gap-1">
        <span class="bg-daw-pulse h-1 w-1 rounded-full" aria-hidden="true" />
        USB Synthesizers
      </span>
      <span class="flex items-center gap-1">
        <span class="bg-daw-text-muted h-1 w-1 rounded-full" aria-hidden="true" />
        External DAWs
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { AlertCircle, BookOpen, Cable, Clock, Plug, SlidersHorizontal, Split, Zap } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'

  defineProps<{
    isConnecting?: boolean
    isUnsupported?: boolean
    disabledReason?: string
  }>()

  defineEmits<{
    enable: []
    openGuide: []
  }>()
</script>
