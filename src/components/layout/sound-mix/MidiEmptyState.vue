<template>
  <div
    class="border-daw-border bg-daw-surface/40 rounded-panel relative flex flex-col items-center justify-center gap-3 border p-5 text-center"
    role="region"
    aria-label="MIDI Output setup"
  >
    <!-- Header chip -->
    <div
      class="border-daw-signal/30 bg-daw-signal/10 text-daw-signal rounded-chip text-micro inline-flex items-center gap-1.5 border px-2.5 py-0.5 font-mono"
    >
      <span class="bg-daw-signal h-1.5 w-1.5 animate-pulse rounded-full" aria-hidden="true" />
      <span>Hardware &amp; DAW Sync</span>
      <span class="text-daw-text-muted/60">·</span>
      <span class="text-daw-text-muted font-normal lowercase">web midi</span>
    </div>

    <!-- Title & Tagline -->
    <div class="flex max-w-lg flex-col gap-1">
      <div class="flex items-center justify-center gap-2">
        <Cable class="text-daw-signal h-4 w-4" aria-hidden="true" />
        <h3 class="text-daw-text font-ui text-sm font-bold tracking-tight">Web MIDI Output Workstation</h3>
      </div>
      <p class="text-daw-text-muted font-ui text-xs leading-relaxed">
        Stream live generative melodies and chord progressions directly into hardware synthesizers, virtual MIDI
        loopback cables, or your DAW.
      </p>
    </div>

    <!-- Action buttons -->
    <div class="flex flex-wrap items-center justify-center gap-2">
      <DawButton
        size="sm"
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
        size="sm"
        appearance="panel"
        :icon="BookOpen"
        aria-label="Open DAW routing guide"
        title="View setup instructions for macOS, Windows, and hardware synths"
        @click="$emit('openGuide')"
      >
        Routing Guide
      </DawButton>

      <DawButton
        v-if="hasExternalRoutes"
        size="sm"
        appearance="surface"
        :icon="RotateCcw"
        aria-label="Reset all tracks to internal synthesizer"
        title="Switch all track destinations back to Internal Synth"
        @click="$emit('resetInternal')"
      >
        Reset to Internal
      </DawButton>
    </div>

    <!-- Unsupported / Insecure context banner -->
    <div
      v-if="isUnsupported"
      class="border-daw-danger/40 bg-daw-danger/10 text-daw-danger rounded-control text-micro flex items-center gap-2 border px-3 py-1.5 font-mono"
      role="alert"
    >
      <AlertCircle class="h-3.5 w-3.5 shrink-0" />
      <span>{{
        disabledReason || 'Web MIDI is not supported in this browser. Please use Chrome, Edge, or Opera.'
      }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { AlertCircle, BookOpen, Cable, Plug, RotateCcw } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'

  defineProps<{
    isConnecting?: boolean
    isUnsupported?: boolean
    disabledReason?: string
    hasExternalRoutes?: boolean
  }>()

  defineEmits<{
    enable: []
    openGuide: []
    resetInternal: []
  }>()
</script>
