<template>
  <DawModal v-model="isOpen" title="About Melody Mate" max-width="max-w-xl">
    <div class="flex flex-col gap-4">
      <!-- Hero Header: Logo, Name, Version, Author -->
      <div class="bg-daw-panel/40 border-daw-border rounded-panel flex flex-col items-center border p-5 text-center">
        <!-- Logo Icon -->
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

        <p class="text-daw-text-muted font-ui mt-2 max-w-md text-xs leading-relaxed">
          {{ APP_METADATA.tagline }}. Runs completely client-side in your browser with zero latency and full offline
          capability.
        </p>

        <div class="text-daw-text-muted text-micro mt-2.5 font-mono">
          {{ APP_METADATA.copyright }}
        </div>
      </div>

      <!-- Quick Links Grid -->
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <a
          :href="APP_METADATA.githubUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="bg-daw-panel/50 hover:bg-daw-surface border-daw-border hover:border-daw-signal/50 rounded-control group flex flex-col items-center justify-center gap-1.5 border p-2.5 text-center transition-colors"
          title="Open GitHub Repository"
        >
          <GitBranch class="text-daw-text group-hover:text-daw-signal h-4 w-4 transition-colors" />
          <span class="text-daw-text text-2xs flex items-center gap-0.5 font-medium">
            GitHub
            <ExternalLink class="text-daw-text-muted h-2.5 w-2.5" />
          </span>
        </a>

        <a
          :href="APP_METADATA.docsUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="bg-daw-panel/50 hover:bg-daw-surface border-daw-border hover:border-daw-signal/50 rounded-control group flex flex-col items-center justify-center gap-1.5 border p-2.5 text-center transition-colors"
          title="Open Documentation & Manual"
        >
          <BookOpen class="text-daw-text group-hover:text-daw-signal h-4 w-4 transition-colors" />
          <span class="text-daw-text text-2xs flex items-center gap-0.5 font-medium">
            User Guide
            <ExternalLink class="text-daw-text-muted h-2.5 w-2.5" />
          </span>
        </a>

        <a
          :href="APP_METADATA.issuesUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="bg-daw-panel/50 hover:bg-daw-surface border-daw-border hover:border-daw-signal/50 rounded-control group flex flex-col items-center justify-center gap-1.5 border p-2.5 text-center transition-colors"
          title="Report an Issue or Feedback"
        >
          <Bug class="text-daw-text group-hover:text-daw-signal h-4 w-4 transition-colors" />
          <span class="text-daw-text text-2xs flex items-center gap-0.5 font-medium">
            Issues
            <ExternalLink class="text-daw-text-muted h-2.5 w-2.5" />
          </span>
        </a>

        <button
          type="button"
          class="bg-daw-panel/50 hover:bg-daw-surface border-daw-border hover:border-daw-signal/50 rounded-control group flex cursor-pointer flex-col items-center justify-center gap-1.5 border p-2.5 text-center transition-colors"
          title="View Keyboard Shortcuts (?)"
          @click="openShortcutsModal"
        >
          <Keyboard class="text-daw-text group-hover:text-daw-signal h-4 w-4 transition-colors" />
          <span class="text-daw-text text-2xs font-medium">Shortcuts (?)</span>
        </button>
      </div>

      <!-- License & Non-Commercial Protection Card -->
      <div class="bg-daw-panel/50 border-daw-border rounded-panel flex flex-col gap-2 border p-3.5">
        <div class="flex items-center justify-between">
          <span class="text-daw-signal text-2xs font-mono font-bold tracking-wider uppercase"> License & Usage </span>
          <span
            class="bg-daw-surface border-daw-border text-daw-text rounded-chip text-micro border px-2 py-0.5 font-mono"
          >
            {{ APP_METADATA.license }}
          </span>
        </div>

        <p class="text-daw-text-muted font-ui text-xs leading-relaxed">
          {{ APP_METADATA.licenseDetails }}
        </p>
      </div>

      <!-- Engine & Framework Credits -->
      <div class="bg-daw-panel/30 border-daw-border rounded-panel flex flex-col gap-2 border p-3">
        <div class="text-daw-text-muted text-micro font-mono font-bold tracking-wider uppercase">
          Powered by Open Technologies
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="tech in ENGINE_CREDITS"
            :key="tech.name"
            class="bg-daw-surface border-daw-border text-daw-text rounded-chip text-micro flex items-center gap-1 border px-2 py-1 font-mono"
          >
            <span class="text-daw-signal font-semibold">{{ tech.name }}</span>
            <span class="text-daw-text-muted">({{ tech.role }})</span>
          </span>
        </div>
      </div>

      <!-- System Diagnostics & Environment Info -->
      <div
        class="bg-daw-panel/20 border-daw-border text-daw-text-muted rounded-panel text-micro flex items-center justify-between border px-3 py-2 font-mono"
      >
        <div class="flex items-center gap-2">
          <span class="h-2 w-2 rounded-full" :class="isAudioRunning ? 'bg-emerald-400' : 'bg-daw-text-muted/40'" />
          <span>Audio: {{ isAudioRunning ? 'Active' : 'Standby' }}</span>
          <span v-if="audioSampleRate > 0">&middot; {{ (audioSampleRate / 1000).toFixed(1) }} kHz</span>
        </div>

        <button
          type="button"
          class="hover:text-daw-text flex cursor-pointer items-center gap-1 transition-colors"
          :title="copied ? 'Copied to clipboard' : 'Copy system diagnostic info'"
          @click="copyDiagnostics"
        >
          <Check v-if="copied" class="h-3 w-3 text-emerald-400" />
          <Copy v-else class="h-3 w-3" />
          <span>{{ copied ? 'Copied!' : 'Copy System Info' }}</span>
        </button>
      </div>
    </div>

    <!-- Modal Footer -->
    <template #footer>
      <div class="flex w-full items-center justify-between text-xs">
        <button
          type="button"
          class="text-daw-text-muted hover:text-daw-signal text-micro flex cursor-pointer items-center gap-1 font-mono transition-colors"
          title="Open Welcome Tour"
          @click="openWelcomeModal"
        >
          <Sparkles class="h-3 w-3" />
          <span>Welcome Tour</span>
        </button>
        <DawButton size="md" appearance="surface" variant="signal" @click="isOpen = false"> Close </DawButton>
      </div>
    </template>
  </DawModal>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { AudioWaveform, BookOpen, Bug, Check, Copy, ExternalLink, GitBranch, Keyboard, Sparkles } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawModal from '@/components/common/DawModal.vue'
  import { getAudioContextState, getAudioSampleRate } from '@/audio/audio-runtime'
  import { APP_METADATA } from '@/config/defaults'
  import { useUiStore } from '@/stores/ui.store'

  const isOpen = defineModel<boolean>({ default: false })
  const uiStore = useUiStore()

  const copied = ref(false)

  const isAudioRunning = computed(() => getAudioContextState() === 'running')
  const audioSampleRate = computed(() => getAudioSampleRate())

  const ENGINE_CREDITS = [
    { name: 'Tone.js', role: 'Audio DSP & Clock' },
    { name: 'Tonal.js', role: 'Music Theory & Scales' },
    { name: 'midi-writer-js', role: 'SMF Multi-Track MIDI' },
    { name: 'Vue 3 & Pinia', role: 'Workstation UI' },
    { name: 'Tailwind CSS v4', role: 'Modern Studio Theme' }
  ] as const

  function openWelcomeModal(): void {
    isOpen.value = false
    uiStore.openWelcome()
  }

  function openShortcutsModal(): void {
    isOpen.value = false
    uiStore.openShortcuts()
  }

  async function copyDiagnostics(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    const info = [
      `App: ${APP_METADATA.name} ${APP_METADATA.version} (${APP_METADATA.edition})`,
      `Audio Context: ${getAudioContextState()}`,
      `Sample Rate: ${getAudioSampleRate()} Hz`,
      `Platform: ${typeof navigator !== 'undefined' ? navigator.platform || navigator.userAgent : 'Unknown'}`
    ].join('\n')

    try {
      await navigator.clipboard.writeText(info)
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 2000)
    } catch {
      // Clipboard write failed
    }
  }
</script>
