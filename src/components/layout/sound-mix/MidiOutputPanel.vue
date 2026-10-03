<template>
  <div class="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3" aria-label="MIDI Output routing workstation">
    <!-- Top Bar: Global actions, Panic, connection status & preview toggle -->
    <div
      class="border-daw-border bg-daw-panel rounded-control flex flex-wrap items-center justify-between gap-3 border px-3 py-2"
    >
      <!-- Connection & Port controls -->
      <div class="flex flex-wrap items-center gap-2">
        <template v-if="snapshot.enabled">
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

          <!-- Panic / All Notes Off -->
          <DawButton
            size="sm"
            appearance="panel"
            :icon="ZapOff"
            aria-label="Send All Notes Off to all MIDI ports"
            title="Panic: Instantly stops and silences all sounding notes on all MIDI ports"
            @click="onPanic"
          >
            {{ isPanicking ? 'Silenced' : 'Panic' }}
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

        <template v-else>
          <span class="text-daw-text-muted text-2xs font-mono font-medium">MIDI Output Disabled</span>
        </template>
      </div>

      <!-- Preview toggle -->
      <div v-if="snapshot.enabled" class="flex items-center gap-3">
        <DawToggle
          v-model="sendPreviews"
          appearance="switch"
          size="sm"
          variant="signal"
          label="Send previews to MIDI"
          :disabled="isPlaybackActive"
          :disabled-reason="isPlaybackActive ? 'Previews disabled during transport playback' : undefined"
          aria-label="Send previews to external MIDI"
          title="Previews always play internally. Enable this to also stream audition notes to MIDI."
        />
      </div>
    </div>

    <!-- Empty State: Displayed when Web MIDI is not yet enabled -->
    <MidiEmptyState
      v-if="!snapshot.enabled"
      :is-connecting="isRequesting"
      :is-unsupported="snapshot.status === 'unsupported' || snapshot.status === 'insecure-context'"
      :disabled-reason="enableDisabledReason"
      @enable="onEnableMidi"
    />

    <template v-else>
      <!-- Overall connection banner if not ready or when attention needed -->
      <MidiConnectionStatus v-if="!isReadyAndAvailable" />

      <!-- Dual Track Routing Matrix: Side-by-side on desktop/laptop -->
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <MidiTrackRoute track="lead" title="Melody Track" variant="signal" />
        <MidiTrackRoute track="chord" title="Chords Track" variant="chord" />
      </div>
    </template>

    <!-- Collapsible Setup & Signal Flow Guide -->
    <MidiSetupGuide />
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { RotateCw, ZapOff } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawToggle from '@/components/common/DawToggle.vue'
  import { useAudioStore } from '@/stores/audio.store'
  import { useMidiOutputStore } from '@/stores/midi-output.store'
  import MidiConnectionStatus from './MidiConnectionStatus.vue'
  import MidiEmptyState from './MidiEmptyState.vue'
  import MidiSetupGuide from './MidiSetupGuide.vue'
  import MidiTrackRoute from './MidiTrackRoute.vue'

  const midiStore = useMidiOutputStore()
  const audioStore = useAudioStore()

  const isRequesting = ref(false)
  const isPanicking = ref(false)

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

  function onPanic(): void {
    if (isPanicking.value) return
    isPanicking.value = true
    midiStore.panic()
    setTimeout(() => {
      isPanicking.value = false
    }, 600)
  }
</script>
