<template>
  <DawModal v-model="isOpen" title="Welcome to Melody Mate" max-width="max-w-2xl">
    <div class="flex flex-col gap-4">
      <!-- Hero Header: Icon, Title, Edition, Tagline -->
      <div class="bg-daw-panel/40 border-daw-border rounded-panel flex flex-col items-center border p-5 text-center">
        <div
          class="rounded-panel from-daw-signal to-daw-chord shadow-daw-signal/10 mb-3 flex h-14 w-14 shrink-0 items-center justify-center bg-linear-to-br shadow-xl"
        >
          <AudioWaveform class="h-7 w-7 text-white" />
        </div>

        <div class="flex items-center gap-2">
          <h2 class="text-daw-text font-ui text-base font-bold tracking-tight uppercase">
            {{ APP_METADATA.name }}
          </h2>
          <span
            class="bg-daw-surface border-daw-border text-daw-signal rounded-chip text-micro border px-2 py-0.5 font-mono font-semibold"
          >
            v{{ APP_METADATA.version }}
          </span>
        </div>

        <div class="text-daw-signal text-micro mt-0.5 font-mono font-medium tracking-wider uppercase">
          {{ APP_METADATA.edition }}
        </div>

        <p class="text-daw-text-muted font-ui mt-2 max-w-lg text-xs leading-relaxed">
          {{ APP_METADATA.tagline }}. Built for music producers, beatmakers, and composers with client-side synthesis,
          real-time voice-leading heuristics, and direct multi-track DAW export.
        </p>
      </div>

      <!-- Quickstart 3-Step Guide -->
      <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div class="bg-daw-panel/50 border-daw-border rounded-panel flex flex-col gap-1.5 border p-3">
          <div class="flex items-center gap-2">
            <Sliders class="text-daw-signal h-4 w-4 shrink-0" />
            <h3 class="text-daw-text font-ui text-xs font-semibold">1. Key & Tempo</h3>
          </div>
          <p class="text-daw-text-muted font-ui text-2xs leading-relaxed">
            Set your root key, scale, and BPM in the top transport bar. Everything generated automatically adheres to
            your musical foundation.
          </p>
        </div>

        <div class="bg-daw-panel/50 border-daw-border rounded-panel flex flex-col gap-1.5 border p-3">
          <div class="flex items-center gap-2">
            <Sparkles class="text-daw-signal h-4 w-4 shrink-0" />
            <h3 class="text-daw-text font-ui text-xs font-semibold">2. Compose & Generate</h3>
          </div>
          <p class="text-daw-text-muted font-ui text-2xs leading-relaxed">
            Press
            <kbd
              class="bg-daw-surface border-daw-border text-daw-signal rounded-chip text-micro border px-1 py-0.5 font-mono"
              >C</kbd
            >
            for Chord Studio,
            <kbd
              class="bg-daw-surface border-daw-border text-daw-signal rounded-chip text-micro border px-1 py-0.5 font-mono"
              >G</kbd
            >
            to generate melodies, or
            <kbd
              class="bg-daw-surface border-daw-border text-daw-signal rounded-chip text-micro border px-1 py-0.5 font-mono"
              >A</kbd
            >
            for arpeggios.
          </p>
        </div>

        <div class="bg-daw-panel/50 border-daw-border rounded-panel flex flex-col gap-1.5 border p-3">
          <div class="flex items-center gap-2">
            <Download class="text-daw-signal h-4 w-4 shrink-0" />
            <h3 class="text-daw-text font-ui text-xs font-semibold">3. Audition & Export</h3>
          </div>
          <p class="text-daw-text-muted font-ui text-2xs leading-relaxed">
            Press
            <kbd
              class="bg-daw-surface border-daw-border text-daw-signal rounded-chip text-micro border px-1 py-0.5 font-mono"
              >Space</kbd
            >
            to play. Shape synth sounds or route live MIDI in Sound & Mix (<kbd
              class="bg-daw-surface border-daw-border text-daw-signal rounded-chip text-micro border px-1 py-0.5 font-mono"
              >S</kbd
            >), then download clean multi-track MIDI into your DAW.
          </p>
        </div>
      </div>

      <!-- Direct MIDI Output Callout Card -->
      <div
        class="bg-daw-panel/60 border-daw-border rounded-panel flex flex-col items-start justify-between gap-3 border p-3.5 sm:flex-row sm:items-center"
      >
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <Cable class="text-daw-signal h-3.5 w-3.5 shrink-0" />
            <span class="text-daw-signal text-2xs font-mono font-bold tracking-wider uppercase">
              Direct MIDI Output &amp; Routing
            </span>
            <span
              class="border-daw-signal/30 bg-daw-signal/10 text-daw-signal rounded-chip text-micro border px-1.5 py-0.5 font-mono lowercase"
            >
              experimental
            </span>
          </div>
          <p class="text-daw-text-muted font-ui text-2xs max-w-md leading-relaxed">
            Stream generative melodies and chords directly to your DAW or hardware synths in real time via Web MIDI.
            Configure independent ports, channels, and latency offsets in Sound & Mix (<kbd
              class="bg-daw-surface border-daw-border text-daw-signal rounded-chip text-micro border px-1 py-0.5 font-mono"
              >S</kbd
            >).
          </p>
        </div>

        <DawButton
          size="sm"
          appearance="surface"
          variant="signal"
          :icon="Cable"
          class="shrink-0"
          title="Open MIDI Output settings in Sound & Mix"
          @click="openMidiRouting"
        >
          MIDI Routing
        </DawButton>
      </div>

      <!-- Legacy Version Callout Card -->
      <div
        class="bg-daw-panel/60 border-daw-border rounded-panel flex flex-col items-start justify-between gap-3 border p-3.5 sm:flex-row sm:items-center"
      >
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="text-daw-chord text-2xs font-mono font-bold tracking-wider uppercase">
              Melody Mate v1 (Legacy)
            </span>
            <span
              class="border-daw-chord/30 bg-daw-chord/10 text-daw-chord rounded-chip text-micro py-0.2 border px-1.5 font-mono"
            >
              Still Available
            </span>
          </div>
          <p class="text-daw-text-muted font-ui text-2xs max-w-md leading-relaxed">
            Looking for the classic version? Melody Mate v1 remains accessible online. Version 2 is an entirely
            redesigned workstation with polyphonic synthesizers and canvas piano roll.
          </p>
        </div>

        <a
          :href="APP_METADATA.legacyAppUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="bg-daw-surface hover:bg-daw-surface-elevated border-daw-border text-daw-text hover:border-daw-chord/50 rounded-control group flex shrink-0 items-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition-colors"
          title="Open Melody Mate v1 Legacy Version"
        >
          <span>Open v1 Legacy</span>
          <ExternalLink class="text-daw-text-muted group-hover:text-daw-chord h-3 w-3 transition-colors" />
        </a>
      </div>

      <!-- Browser Audio Tip -->
      <div
        class="bg-daw-panel/20 border-daw-border text-daw-text-muted rounded-panel text-micro flex items-center gap-2 border px-3 py-2 font-mono"
      >
        <Volume2 class="text-daw-signal h-3.5 w-3.5 shrink-0" />
        <span
          >Audio notice: Web browsers require user interaction before playing sound. Press Space or click anywhere to
          activate the audio engine.</span
        >
      </div>
    </div>

    <!-- Modal Footer -->
    <template #footer>
      <div class="flex w-full items-center justify-between text-xs">
        <!-- Checkbox: Show on startup -->
        <label
          class="hover:text-daw-text text-daw-text-muted flex cursor-pointer items-center gap-2 text-xs transition-colors select-none"
        >
          <input
            v-model="showOnStartupModel"
            type="checkbox"
            class="rounded-chip border-daw-border bg-daw-panel text-daw-signal focus:ring-daw-signal/50 accent-daw-signal h-4 w-4 cursor-pointer"
          />
          <span class="font-ui text-2xs">Show on startup</span>
        </label>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2">
          <DawButton size="md" appearance="ghost" @click="openShortcuts"> Shortcuts (?) </DawButton>
          <DawButton size="md" appearance="surface" variant="signal" @click="close"> Start Creating </DawButton>
        </div>
      </div>
    </template>
  </DawModal>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { AudioWaveform, Cable, Download, ExternalLink, Sliders, Sparkles, Volume2 } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawModal from '@/components/common/DawModal.vue'
  import { APP_METADATA } from '@/config/defaults'
  import { useUiStore } from '@/stores/ui.store'

  const isOpen = defineModel<boolean>({ default: false })
  const uiStore = useUiStore()

  const showOnStartupModel = computed({
    get: () => uiStore.showWelcomeOnStartup,
    set: (enabled: boolean) => {
      uiStore.setShowWelcomeOnStartup(enabled)
    }
  })

  function openShortcuts(): void {
    isOpen.value = false
    uiStore.openShortcuts()
  }

  function openMidiRouting(): void {
    isOpen.value = false
    uiStore.setSoundDockView('midi')
    uiStore.setSoundDockOpen(true)
  }

  function close(): void {
    isOpen.value = false
  }
</script>
