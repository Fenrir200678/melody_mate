<template>
  <div class="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3" aria-label="MIDI Output routing workstation">
    <!-- Top Bar: Global actions, connection status & preview toggle -->
    <div
      class="border-daw-border bg-daw-panel rounded-control flex flex-wrap items-center justify-between gap-3 border p-2.5"
    >
      <!-- Connection & Port controls -->
      <div class="flex flex-wrap items-center gap-2">
        <DawButton
          v-if="!snapshot.enabled"
          size="sm"
          variant="signal"
          :icon="Plug"
          :disabled="isRequesting || snapshot.status === 'unsupported' || snapshot.status === 'insecure-context'"
          :disabled-reason="enableDisabledReason"
          aria-label="Enable Web MIDI access"
          @click="onEnableMidi"
        >
          {{ isRequesting ? 'Connecting…' : 'Enable MIDI' }}
        </DawButton>

        <template v-else>
          <DawButton
            size="sm"
            appearance="panel"
            :icon="RotateCw"
            aria-label="Refresh connected MIDI devices"
            title="Scan for newly connected MIDI devices"
            @click="onRefreshPorts"
          >
            Refresh ports
          </DawButton>
          <DawButton
            size="sm"
            appearance="ghost"
            aria-label="Disable MIDI output"
            title="Disconnect and disable external MIDI output"
            @click="onDisableMidi"
          >
            Disable MIDI
          </DawButton>
        </template>
      </div>

      <!-- Preview toggle -->
      <div class="flex items-center gap-3">
        <DawToggle
          v-model="sendPreviews"
          appearance="switch"
          size="sm"
          variant="signal"
          label="Send previews to MIDI"
          :disabled="isPlaybackActive"
          :disabled-reason="isPlaybackActive ? 'Previews disabled during transport playback' : undefined"
          aria-label="Send previews to external MIDI"
          title="Previews always play internally. Enable this to also send them to MIDI."
        />
      </div>
    </div>

    <!-- Overall connection banner if not ready or when attention needed -->
    <MidiConnectionStatus v-if="!isReadyAndAvailable" />

    <!-- Routing Matrix for Tracks -->
    <div class="flex flex-col gap-2.5">
      <MidiTrackRoute track="lead" title="Melody track" variant="signal" />
      <MidiTrackRoute track="chord" title="Chords track" variant="chord" />
    </div>

    <!-- Collapsible Setup & Signal Flow Guide -->
    <details class="border-daw-border bg-daw-panel rounded-control group text-2xs border">
      <summary
        class="text-daw-text-muted hover:text-daw-text flex cursor-pointer items-center justify-between p-2.5 font-mono font-medium select-none"
      >
        <span class="flex items-center gap-1.5">
          <Info class="text-daw-signal h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>MIDI routing &amp; DAW signal flow guide</span>
        </span>
        <ChevronDown class="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div
        class="border-daw-border text-daw-text-muted text-micro flex flex-col gap-2 border-t p-3 font-mono leading-relaxed"
      >
        <p>
          <strong class="text-daw-text">No Audio Return:</strong> External MIDI outputs raw Note-On, Note-Off, and
          Velocity events. Sound generation happens in your DAW or hardware synthesizer. Melody Mate channel faders, FX
          sends, and master meters only affect internal audio.
        </p>
        <p>
          <strong class="text-daw-text">DAW Setup (macOS):</strong> In
          <code class="text-daw-signal">Audio MIDI Setup</code>, double-click the
          <code class="text-daw-signal">IAC Driver</code>, check &ldquo;Device is online&rdquo;, and select the IAC bus
          here. In Ableton or Logic, set the track input to the IAC bus and arm the track.
        </p>
        <p>
          <strong class="text-daw-text">DAW Setup (Windows / Linux):</strong> Configure a virtual loopback MIDI driver
          (e.g. loopMIDI or ALSA Sequencer) to route notes into your DAW.
        </p>
        <p>
          <strong class="text-daw-text">Transport Safety:</strong> Test notes and external audition previews are
          intentionally muted during transport playback to guarantee zero voice overlap with the song schedule.
        </p>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { ChevronDown, Info, Plug, RotateCw } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawToggle from '@/components/common/DawToggle.vue'
  import { useAudioStore } from '@/stores/audio.store'
  import { useMidiOutputStore } from '@/stores/midi-output.store'
  import MidiConnectionStatus from './MidiConnectionStatus.vue'
  import MidiTrackRoute from './MidiTrackRoute.vue'

  const midiStore = useMidiOutputStore()
  const audioStore = useAudioStore()

  const isRequesting = ref(false)

  onMounted(() => {
    // Ensure runtime is instantiated for active setting updates
    midiStore.getRuntime()
  })

  const snapshot = computed(() => midiStore.snapshot)
  const isPlaybackActive = computed(() => audioStore.isPlaying)

  const isReadyAndAvailable = computed(
    () => snapshot.value.enabled && (snapshot.value.status === 'ready' || snapshot.value.status === 'available')
  )

  const sendPreviews = computed({
    get: () => midiStore.settings.lead.sendPreviews || midiStore.settings.chord.sendPreviews,
    set: (enabled: boolean) => midiStore.setSendPreviews(enabled)
  })

  const enableDisabledReason = computed(() => {
    if (snapshot.value.status === 'unsupported') return 'Web MIDI is not supported in this browser'
    if (snapshot.value.status === 'insecure-context') return 'Web MIDI requires HTTPS or localhost'
    return undefined
  })

  async function onEnableMidi(): Promise<void> {
    if (isRequesting.value) return
    isRequesting.value = true
    try {
      await midiStore.enable()
    } finally {
      isRequesting.value = false
    }
  }

  async function onDisableMidi(): Promise<void> {
    await midiStore.disable()
  }

  async function onRefreshPorts(): Promise<void> {
    await midiStore.refresh()
  }
</script>
