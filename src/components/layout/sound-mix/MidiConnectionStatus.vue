<template>
  <!-- Compact header badge -->
  <div v-if="compact" class="text-micro flex items-center gap-1.5 font-mono" :title="statusMessage">
    <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="dotClass" aria-hidden="true" />
    <span class="font-medium" :class="textClass">{{ compactLabel }}</span>
  </div>

  <!-- Full status row with recovery actions -->
  <div
    v-else
    class="border-daw-border bg-daw-surface rounded-control text-2xs flex flex-wrap items-center justify-between gap-2 border px-3 py-2"
    role="status"
    :aria-live="isErrorOrWarning ? 'assertive' : 'polite'"
  >
    <div class="flex items-center gap-2">
      <span class="h-2 w-2 shrink-0 rounded-full" :class="dotClass" aria-hidden="true" />
      <span class="font-medium" :class="textClass">{{ fullLabel }}</span>
      <span class="text-daw-text-muted hidden sm:inline">— {{ statusMessage }}</span>
    </div>

    <!-- Contextual recovery action -->
    <div v-if="recoveryAction" class="flex items-center gap-1">
      <DawButton
        v-if="recoveryAction === 'refresh'"
        size="xs"
        appearance="panel"
        :icon="RotateCw"
        aria-label="Refresh MIDI ports"
        @click="midiStore.refresh"
      >
        Refresh ports
      </DawButton>
      <DawButton
        v-else-if="recoveryAction === 'enable'"
        size="xs"
        variant="signal"
        :icon="Plug"
        aria-label="Enable MIDI"
        @click="onEnable"
      >
        Enable MIDI
      </DawButton>
      <DawButton
        v-else-if="recoveryAction === 'retry'"
        size="xs"
        appearance="panel"
        :icon="RotateCw"
        aria-label="Retry MIDI connection"
        @click="midiStore.refresh"
      >
        Retry
      </DawButton>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { Plug, RotateCw } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import { useMidiOutputStore } from '@/stores/midi-output.store'

  defineProps<{ compact?: boolean }>()
  const midiStore = useMidiOutputStore()

  async function onEnable(): Promise<void> {
    await midiStore.enable({ autoRoute: true })
  }

  const snapshot = computed(() => midiStore.snapshot)
  const status = computed(() => snapshot.value.status)
  const statusMessage = computed(() => snapshot.value.message)

  const isErrorOrWarning = computed(() =>
    ['unsupported', 'insecure-context', 'denied', 'error', 'disconnected', 'no-outputs'].includes(status.value)
  )

  const compactLabel = computed(() => {
    switch (status.value) {
      case 'ready':
        return 'MIDI: Ready'
      case 'opening':
      case 'requesting':
        return 'MIDI: Connecting…'
      case 'not-enabled':
        return 'MIDI: Off'
      case 'no-outputs':
        return 'MIDI: No ports'
      case 'disconnected':
        return 'MIDI: Disconnected'
      case 'denied':
        return 'MIDI: Denied'
      case 'unsupported':
      case 'insecure-context':
      case 'error':
        return 'MIDI: Unavailable'
      case 'available':
        return 'MIDI: Available'
      default:
        return 'MIDI'
    }
  })

  const fullLabel = computed(() => {
    switch (status.value) {
      case 'ready':
        return 'MIDI output ready'
      case 'opening':
        return 'Opening port…'
      case 'requesting':
        return 'Requesting MIDI permission…'
      case 'not-enabled':
        return 'MIDI output disabled'
      case 'no-outputs':
        return 'No connected outputs detected'
      case 'disconnected':
        return 'Port disconnected'
      case 'denied':
        return 'Access denied by browser'
      case 'insecure-context':
        return 'Insecure context (requires HTTPS or localhost)'
      case 'unsupported':
        return 'Web MIDI unsupported in this browser'
      case 'error':
        return 'MIDI error'
      case 'available':
        return 'MIDI ready for port assignment'
      default:
        return status.value
    }
  })

  const dotClass = computed(() => {
    switch (status.value) {
      case 'ready':
        return 'bg-daw-signal shadow-sm'
      case 'opening':
      case 'requesting':
      case 'available':
        return 'bg-daw-pulse animate-pulse'
      case 'disconnected':
      case 'denied':
      case 'error':
      case 'insecure-context':
      case 'unsupported':
        return 'bg-daw-danger'
      default:
        return 'bg-daw-text-muted/50'
    }
  })

  const textClass = computed(() => {
    if (isErrorOrWarning.value) return 'text-daw-danger'
    if (status.value === 'ready') return 'text-daw-signal'
    if (status.value === 'not-enabled') return 'text-daw-text-muted'
    return 'text-daw-text'
  })

  const recoveryAction = computed(() => {
    switch (status.value) {
      case 'not-enabled':
        return 'enable'
      case 'no-outputs':
        return 'refresh'
      case 'disconnected':
      case 'error':
        return 'retry'
      default:
        return null
    }
  })
</script>
