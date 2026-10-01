<template>
  <aside
    id="daw-mobile-gate"
    class="daw-mobile-gate bg-daw-bg text-daw-text font-ui fixed inset-0 z-50 flex flex-col items-center overflow-y-auto px-5 py-8 md:hidden"
    role="region"
    aria-label="Desktop requirement notice"
  >
    <!-- Background Ambient Glow -->
    <div
      class="bg-daw-signal/10 pointer-events-none absolute -top-24 h-72 w-72 rounded-full blur-3xl"
      aria-hidden="true"
    />

    <div class="relative z-10 my-auto flex w-full max-w-sm flex-col items-center">
      <!-- DAW Brand Header -->
      <div class="mb-5 flex items-center gap-2.5">
        <div
          class="rounded-control from-daw-signal to-daw-chord flex h-8 w-8 shrink-0 items-center justify-center bg-linear-to-br shadow-md"
        >
          <AudioWaveform class="h-4.5 w-4.5 text-white" aria-hidden="true" />
        </div>
        <div class="flex flex-col text-left">
          <div class="flex items-center gap-1.5">
            <span class="text-daw-text text-xs font-bold tracking-tight uppercase">{{ APP_METADATA.name }}</span>
            <span
              class="text-daw-signal border-daw-border bg-daw-surface rounded-chip text-micro py-0.2 border px-1.5 font-mono"
            >
              v{{ APP_METADATA.version }}
            </span>
          </div>
          <span class="text-daw-text-muted text-micro font-mono tracking-wider uppercase">
            {{ APP_METADATA.edition }}
          </span>
        </div>
      </div>

      <!-- Hero Badge -->
      <div
        class="border-daw-border bg-daw-panel mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border shadow-xl"
      >
        <Monitor class="text-daw-signal h-7 w-7" aria-hidden="true" />
      </div>

      <!-- Headline & Explanatory Text -->
      <h1 class="text-daw-text text-center text-base font-bold tracking-tight uppercase">
        Desktop Experience Required
      </h1>

      <p class="text-daw-text-muted mt-2 text-center text-xs leading-relaxed">
        Melody Mate is a generative MIDI workstation designed for multi-track sequencing, synthesizer sound design, and
        high-precision piano-roll editing with keyboard shortcuts.
      </p>

      <!-- Workstation Preview Card -->
      <div class="border-daw-border bg-daw-panel rounded-panel relative my-5 w-full overflow-hidden border shadow-xl">
        <img
          src="/social-image.jpg"
          :alt="`${APP_METADATA.name} desktop workspace`"
          class="h-auto w-full object-cover select-none"
          loading="eager"
          width="1280"
          height="695"
        />
        <div
          class="from-daw-panel/90 via-daw-panel/30 pointer-events-none absolute inset-0 bg-linear-to-t to-transparent"
          aria-hidden="true"
        />
        <div
          class="text-micro text-daw-text-muted absolute right-3 bottom-2.5 left-3 flex items-center justify-between font-mono"
        >
          <span>Dual-track piano roll • Synthesizers • MIDI export</span>
          <span class="text-daw-signal font-semibold">Desktop only</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex w-full flex-col gap-2.5">
        <DawButton
          v-if="canShare"
          :icon="Share2"
          size="md"
          appearance="surface"
          variant="signal"
          block
          title="Send link to your computer"
          aria-label="Send link to your computer"
          @click="shareWorkstationLink"
        >
          Send link to computer
        </DawButton>

        <DawButton
          :icon="isCopied ? Check : Copy"
          size="md"
          appearance="surface"
          :variant="isCopied ? 'pulse' : 'default'"
          block
          title="Copy workstation URL to clipboard"
          aria-label="Copy workstation URL to clipboard"
          @click="copyWorkstationLink"
        >
          {{ isCopied ? 'Link copied to clipboard!' : 'Copy workstation link' }}
        </DawButton>
      </div>

      <!-- Browser Recommendation -->
      <p class="text-daw-text-muted text-2xs mt-5 text-center leading-normal">
        Open in Chrome, Edge, Safari, or Firefox on a laptop or desktop computer to compose.
      </p>
    </div>
  </aside>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { AudioWaveform, Check, Copy, Monitor, Share2 } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import { APP_METADATA } from '@/config/defaults'

  const isCopied = ref(false)
  let copyTimeoutId: ReturnType<typeof setTimeout> | null = null

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function shareWorkstationLink(): Promise<void> {
    if (!canShare) return
    try {
      await navigator.share({
        title: `${APP_METADATA.name} – ${APP_METADATA.edition}`,
        text: `Open ${APP_METADATA.name} on your computer to compose generative MIDI melodies and chord progressions:`,
        url: window.location.href
      })
    } catch {
      // User dismissed share sheet or share failed silently
    }
  }

  async function copyWorkstationLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href)
      isCopied.value = true
      if (copyTimeoutId) clearTimeout(copyTimeoutId)
      copyTimeoutId = setTimeout(() => {
        isCopied.value = false
      }, 2500)
    } catch {
      // Clipboard write failed or permission denied
    }
  }
</script>
