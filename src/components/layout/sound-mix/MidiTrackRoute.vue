<template>
  <div
    class="border-daw-border bg-daw-surface rounded-control flex flex-col justify-between gap-3 border p-3.5 transition-colors"
    :class="{ 'border-daw-danger/50': conflictError || isDisconnected }"
  >
    <!-- Header: Track identity, TX LED, Status, Test note -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="role-dot" :class="`dot-${variant}`" aria-hidden="true" />
        <span class="text-daw-text text-2xs font-semibold">{{ title }}</span>

        <!-- TX Activity LED -->
        <span
          class="rounded-chip text-micro flex items-center gap-1 border px-1.5 py-0.5 font-mono font-medium transition-colors"
          :class="isTxActive ? txActiveClasses : 'border-daw-border/60 bg-daw-panel text-daw-text-muted/60'"
          :title="isTxActive ? 'Transmitting MIDI data' : 'MIDI transmitter idle'"
        >
          <span
            class="h-1.5 w-1.5 rounded-full transition-colors"
            :class="isTxActive ? txDotClasses : 'bg-daw-text-muted/30'"
            aria-hidden="true"
          />
          <span>TX</span>
        </span>

        <!-- Status badge -->
        <span
          class="rounded-chip text-micro flex h-5 items-center px-2 font-mono font-medium"
          :class="statusBadgeClasses"
          :title="statusBadge.description"
        >
          {{ statusBadge.label }}
        </span>
      </div>

      <!-- Test note action -->
      <DawButton
        size="xs"
        appearance="panel"
        :icon="Volume2"
        :disabled="isTestDisabled"
        :disabled-reason="testDisabledReason"
        aria-label="Send test note to this track"
        @click="onTestNote"
      >
        {{ isTesting ? 'Sending…' : 'Test Note' }}
      </DawButton>
    </div>

    <!-- Mode Selector: Internal / MIDI / Both -->
    <div class="border-daw-border/50 flex items-center justify-between gap-2 border-t pt-2.5">
      <span class="text-daw-text-muted text-micro font-mono uppercase tracking-wider">Destination</span>
      <DawSegmented
        :model-value="route.mode"
        :options="MIDI_ROUTE_MODE_OPTIONS"
        size="xs"
        :variant="variant"
        aria-label="Output destination"
        @update:model-value="onModeChange"
      />
    </div>

    <!-- Route Controls Body -->
    <div v-if="route.mode === 'internal'" class="border-daw-border/50 bg-daw-panel/40 rounded-control border border-dashed p-4 text-center">
      <p class="text-daw-text-muted text-micro font-mono leading-relaxed">
        Audio routes to the internal synthesizer engine.<br />
        Select <strong class="text-daw-text">MIDI</strong> or <strong class="text-daw-text">Both</strong> to stream to external ports.
      </p>
    </div>

    <div v-else class="flex flex-col gap-3">
      <!-- Port and Channel Row -->
      <div class="grid grid-cols-[1fr_auto] items-end gap-2.5">
        <!-- Port Selector -->
        <div class="flex min-w-0 flex-col gap-1">
          <label :for="`midi-port-${track}`" class="text-daw-text-muted text-micro font-mono uppercase tracking-wider">
            MIDI Port
          </label>
          <div class="relative flex items-center">
            <Cable class="text-daw-text-muted pointer-events-none absolute left-2 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <select
              :id="`midi-port-${track}`"
              class="border-daw-border bg-daw-panel text-daw-text rounded-chip focus:border-daw-signal text-2xs h-7 w-full cursor-pointer truncate border pl-7 pr-2 font-mono focus:outline-none disabled:cursor-not-allowed"
              :value="route.port?.id ?? ''"
              :disabled="!midiStore.snapshot.enabled"
              :aria-label="`${title} MIDI output port`"
              @change="onPortChange(($event.target as HTMLSelectElement).value)"
            >
              <option value="">-- No port selected --</option>
              <option
                v-for="output in availableOutputs"
                :key="output.id"
                :value="output.id"
                :title="formatFullPortTitle(output)"
              >
                {{ formatPortLabel(output, availableOutputs) }}
              </option>
              <option
                v-if="isPortMissingFromOutputs && route.port"
                :value="route.port.id"
                disabled
                :title="formatFullPortTitle(route.port)"
              >
                {{ formatPortLabel(route.port) }} (Disconnected)
              </option>
            </select>
          </div>
        </div>

        <!-- Channel Selector -->
        <div class="flex flex-col gap-1">
          <label :for="`midi-ch-${track}`" class="text-daw-text-muted text-micro font-mono uppercase tracking-wider">
            Channel
          </label>
          <select
            :id="`midi-ch-${track}`"
            class="border-daw-border bg-daw-panel text-daw-text rounded-chip focus:border-daw-signal text-2xs h-7 w-20 cursor-pointer border px-2 font-mono focus:outline-none disabled:cursor-not-allowed"
            :value="route.channel"
            :aria-label="`${title} MIDI channel`"
            @change="onChannelChange(Number(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="ch in MIDI_CHANNEL_OPTIONS" :key="ch.value" :value="ch.value">
              {{ ch.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- Timing Offset Knob & Latency Info -->
      <div class="border-daw-border/40 bg-daw-panel/30 rounded-control flex items-center justify-between border px-3 py-1.5">
        <div class="flex items-center gap-3">
          <DawKnob
            v-model="offsetValue"
            label="Offset"
            unit="ms"
            size="xs"
            :min="MIDI_OUTPUT_BOUNDS.offsetMs.min"
            :max="MIDI_OUTPUT_BOUNDS.offsetMs.max"
            :step="1"
            :default-value="0"
            :variant="variant"
            @change="onOffsetChange"
          />
          <div class="flex flex-col">
            <span class="text-daw-text text-micro font-mono font-medium">Timing Offset</span>
            <span class="text-daw-text-muted text-micro font-mono">Latency compensation (±200 ms)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Inline conflict warning or route error -->
    <div
      v-if="conflictError || inlineErrorMessage"
      class="text-daw-danger border-daw-danger/30 bg-daw-danger/10 rounded-chip text-micro flex items-center gap-1.5 border px-2.5 py-1.5 font-mono"
      role="alert"
    >
      <AlertTriangle class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{{ conflictError || inlineErrorMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { AlertTriangle, Cable, Volume2 } from '@lucide/vue'
  import DawButton from '@/components/common/DawButton.vue'
  import DawKnob from '@/components/common/DawKnob.vue'
  import DawSegmented from '@/components/common/DawSegmented.vue'
  import { MIDI_OUTPUT_BOUNDS } from '@/config/defaults'
  import { validateMidiRouteConflict } from '@/core/midi/output.schema'
  import type { MidiTrackKey, MidiTrackRoute, OutputRouteMode } from '@/core/midi/output.types'
  import { useAudioStore } from '@/stores/audio.store'
  import { useMidiOutputStore } from '@/stores/midi-output.store'
  import {
    formatFullPortTitle,
    formatPortLabel,
    getRouteStatusBadge,
    MIDI_CHANNEL_OPTIONS,
    MIDI_ROUTE_MODE_OPTIONS
  } from '@/utils/midi-ui.utils'

  const props = defineProps<{
    track: MidiTrackKey
    title: string
    variant: 'signal' | 'chord'
  }>()

  const midiStore = useMidiOutputStore()
  const audioStore = useAudioStore()

  const isTesting = ref(false)
  const conflictError = ref<string | null>(null)
  const inlineErrorMessage = ref<string | null>(null)

  const route = computed(() => midiStore.settings[props.track])
  const availableOutputs = computed(() => midiStore.snapshot.outputs)

  const offsetValue = computed({
    get: () => route.value.offsetMs,
    set: (val: number) => onOffsetChange(val)
  })

  const isPortMissingFromOutputs = computed(() => {
    if (!route.value.port) return false
    return !availableOutputs.value.some((output) => output.id === route.value.port?.id)
  })

  const isDisconnected = computed(() => {
    if (route.value.mode === 'internal') return false
    const status = midiStore.snapshot.routes[props.track]?.status
    return status === 'disconnected' || isPortMissingFromOutputs.value
  })

  const isTxActive = computed(() => {
    if (isTesting.value) return true
    return audioStore.isPlaying && route.value.mode !== 'internal' && !!route.value.port && !isDisconnected.value
  })

  const txActiveClasses = computed(() =>
    props.variant === 'chord'
      ? 'border-daw-chord/40 bg-daw-chord/15 text-daw-chord'
      : 'border-daw-signal/40 bg-daw-signal/15 text-daw-signal'
  )

  const txDotClasses = computed(() =>
    props.variant === 'chord' ? 'bg-daw-chord shadow-sm animate-pulse' : 'bg-daw-signal shadow-sm animate-pulse'
  )

  const statusBadge = computed(() => {
    const rawStatus = midiStore.snapshot.routes[props.track]?.status ?? 'not-enabled'
    return getRouteStatusBadge(rawStatus, route.value.mode, !!route.value.port, props.variant)
  })

  const statusBadgeClasses = computed(() => {
    switch (statusBadge.value.variant) {
      case 'signal':
        return 'bg-daw-signal/15 text-daw-signal border border-daw-signal/30'
      case 'chord':
        return 'bg-daw-chord/15 text-daw-chord border border-daw-chord/30'
      case 'pulse':
        return 'bg-daw-pulse/15 text-daw-pulse border border-daw-pulse/30'
      case 'danger':
        return 'bg-daw-danger/15 text-daw-danger border border-daw-danger/30'
      default:
        return 'bg-daw-surface text-daw-text-muted border border-daw-border'
    }
  })

  const isTestDisabled = computed(() => {
    if (audioStore.isPlaying) return true
    if (route.value.mode === 'internal') return true
    if (!route.value.port) return true
    if (!midiStore.snapshot.enabled) return true
    return isDisconnected.value
  })

  const testDisabledReason = computed(() => {
    if (audioStore.isPlaying) return 'Test note unavailable during transport playback'
    if (route.value.mode === 'internal') return 'Select MIDI or Both to transmit test notes'
    if (!midiStore.snapshot.enabled) return 'Enable MIDI to send test notes'
    if (!route.value.port) return 'Select a MIDI port first'
    if (isDisconnected.value) return 'The selected MIDI device is disconnected'
    return undefined
  })

  function checkConflict(candidate: MidiTrackRoute): boolean {
    const candidateSettings = {
      ...midiStore.settings,
      [props.track]: candidate
    }
    const conflict = validateMidiRouteConflict(candidateSettings)
    if (conflict) {
      const portName = candidate.port ? formatPortLabel(candidate.port) : 'the same port'
      conflictError.value = `Channel conflict: Melody and Chords cannot both use Channel ${candidate.channel} on ${portName}.`
      return true
    }
    conflictError.value = null
    return false
  }

  async function commitRoute(candidate: MidiTrackRoute): Promise<void> {
    inlineErrorMessage.value = null
    try {
      await midiStore.setRoute(props.track, candidate)
    } catch (error) {
      inlineErrorMessage.value = error instanceof Error ? error.message : 'Failed to update route.'
    }
  }

  async function onModeChange(newMode: OutputRouteMode): Promise<void> {
    if (newMode === route.value.mode) return
    let port = route.value.port

    if (newMode !== 'internal' && !port && availableOutputs.value.length > 0) {
      const first = availableOutputs.value[0]
      if (first) port = { id: first.id, name: first.name, manufacturer: first.manufacturer }
    }

    const candidate: MidiTrackRoute = { ...route.value, mode: newMode, port }
    if (newMode !== 'internal' && !port) {
      inlineErrorMessage.value = 'Please select a MIDI port to enable external transmission.'
      return
    }

    if (checkConflict(candidate)) return
    await commitRoute(candidate)
  }

  async function onPortChange(portId: string): Promise<void> {
    const matched = availableOutputs.value.find((p) => p.id === portId)
    const port = matched
      ? { id: matched.id, name: matched.name, manufacturer: matched.manufacturer }
      : route.value.port?.id === portId
        ? route.value.port
        : null

    const candidate: MidiTrackRoute = { ...route.value, port }
    if (checkConflict(candidate)) return
    await commitRoute(candidate)
  }

  async function onChannelChange(newChannel: number): Promise<void> {
    const candidate: MidiTrackRoute = { ...route.value, channel: newChannel }
    if (checkConflict(candidate)) return
    await commitRoute(candidate)
  }

  async function onOffsetChange(newOffset: number): Promise<void> {
    const clamped = Math.min(Math.max(newOffset, MIDI_OUTPUT_BOUNDS.offsetMs.min), MIDI_OUTPUT_BOUNDS.offsetMs.max)
    const candidate: MidiTrackRoute = { ...route.value, offsetMs: clamped }
    await commitRoute(candidate)
  }

  async function onTestNote(): Promise<void> {
    if (isTestDisabled.value || isTesting.value) return
    isTesting.value = true
    try {
      const res = midiStore.testNote(props.track)
      if (!res.ok) inlineErrorMessage.value = res.error
      else inlineErrorMessage.value = null
    } finally {
      setTimeout(() => {
        isTesting.value = false
      }, 300)
    }
  }
</script>
